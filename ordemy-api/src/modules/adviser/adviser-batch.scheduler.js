import pool from "../../config/database.js";
import { HttpError } from "../../utils/http-error.js";
import { DEFAULT_MODEL, GROQ_BASE_URL, loadAiConfiguration } from "./adviser.services.js";

const TIME_ZONE = "Africa/Lagos";
const SCHEDULE_HOURS = [12, 13, 14, 15, 16, 17];
const POLL_INTERVAL_MS = 60_000;
let interval;
let running = false;
let lastTickAt = Date.now();
let lastHeartbeatKey = "";

function getLagosParts(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);
    return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function getSlotDate(date, hour) {
    const parts = getLagosParts(date);
    const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
    const key = `${dateKey}T${String(hour).padStart(2, "0")}:00`;
    const [year, month, day] = dateKey.split("-").map(Number);
    const utcTimestamp = Date.UTC(year, month - 1, day, hour - 1);
    return {
        key,
        scheduledAt: new Date(utcTimestamp),
        from: new Date(utcTimestamp - (hour === 12 ? 12 * 60 * 60 * 1000 : 60 * 60 * 1000)),
    };
}

async function writeSchedulerLog(eventType, details, lecturerId = null) {
    await pool.query(
        `INSERT INTO adviser_ai_scheduler_logs (lecturer_id, event_type, details)
         VALUES (?, ?, ?)`,
        [lecturerId, eventType, details]
    );
}

async function getDueSlots(lecturerId, now) {
    const parts = getLagosParts(now);
    const currentHour = Number(parts.hour);
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    const [runRows] = await pool.query(
        `SELECT slot_key, status, started_at, completed_at FROM adviser_ai_runs
         WHERE lecturer_id = ?
         ORDER BY slot_key DESC LIMIT 200`,
        [lecturerId]
    );
    const latestSlot = runRows.find((run) => run.status === "completed")?.slot_key ?? "";
    const slots = [];
    const dueSlotKeys = new Set();

    const latestDate = latestSlot.slice(0, 10);
    const latestDateTime = latestDate
        ? Date.parse(`${latestDate}T00:00:00Z`)
        : NaN;
    const todayDateTime = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day)
    );
    const daysSinceLatest = Number.isFinite(latestDateTime)
        ? Math.floor((todayDateTime - latestDateTime) / (24 * 60 * 60 * 1000))
        : 1;
    const firstDayOffset = Math.min(Math.max(daysSinceLatest, 1), 30);
    if (daysSinceLatest > 30) {
        await writeSchedulerLog(
            "catchup_limit",
            `Capped recovery at 30 days after last slot ${latestSlot}`,
            lecturerId
        );
    }

    for (let dayOffset = firstDayOffset; dayOffset >= 0; dayOffset -= 1) {
        const date = new Date(Date.UTC(
            Number(parts.year),
            Number(parts.month) - 1,
            Number(parts.day) - dayOffset,
            12
        ));
        const dateKey = getLagosParts(date);
        const candidateDate = `${dateKey.year}-${dateKey.month}-${dateKey.day}`;
        if (dayOffset === 0 && currentHour < 12) continue;

        for (const hour of SCHEDULE_HOURS) {
            if (candidateDate === today && hour > currentHour) continue;
            const slot = getSlotDate(date, hour);
            if (slot.key > latestSlot) {
                slots.push(slot);
                dueSlotKeys.add(slot.key);
            }
        }
    }

    const staleBefore = now.getTime() - 5 * 60 * 1000;
    for (const run of runRows) {
        if (
            !["running", "failed"].includes(run.status) ||
            dueSlotKeys.has(run.slot_key)
        ) {
            continue;
        }
        const retryAfter = run.status === "running"
            ? new Date(run.started_at).getTime()
            : new Date(run.completed_at).getTime();
        if (retryAfter > staleBefore) continue;
        const [dateKey, timeKey] = run.slot_key.split("T");
        const slot = getSlotDate(
            new Date(`${dateKey}T12:00:00Z`),
            Number(timeKey.slice(0, 2))
        );
        if (slot.scheduledAt <= now) {
            slots.push(slot);
            dueSlotKeys.add(slot.key);
        }
    }

    slots.sort((left, right) => left.key.localeCompare(right.key));
    return slots;
}

async function callGroq(config, questions) {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
            model: config.model || DEFAULT_MODEL,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are an academic support assistant helping a university adviser triage student questions. Group questions that genuinely ask about the same issue. Do not invent university policies or claim an action has been taken. Each group draft should acknowledge the issue, give a cautious helpful response from the supplied question context only, and say when adviser confirmation is needed. Return only JSON with shape {"groups":[{"title":"short theme","question_ids":[1,2],"draft_reply":"draft for adviser review"}]}. Include every supplied question exactly once; never omit, duplicate, or add IDs.`,
                },
                {
                    role: "user",
                    content: JSON.stringify(questions.map((question) => ({
                        id: question.id,
                        subject: question.subject,
                        question: question.query,
                        category: question.query_type,
                    }))),
                },
            ],
        }),
    });
    if (!response.ok) {
        const providerMessage = (await response.text()).slice(0, 500);
        throw new Error(`Groq returned ${response.status}: ${providerMessage}`);
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
        throw new Error("Groq returned no AI grouping content");
    }
    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error("Groq returned invalid JSON for the grouped questions");
    }
    validateGroups(parsed.groups, questions);
    return parsed.groups;
}

function validateGroups(groups, questions) {
    if (!Array.isArray(groups)) throw new Error("AI output did not include groups");
    const questionIds = new Set(questions.map(({ id }) => Number(id)));
    const included = [];
    for (const group of groups) {
        if (
            typeof group?.title !== "string" ||
            typeof group?.draft_reply !== "string" ||
            !group.draft_reply.trim() ||
            !Array.isArray(group.question_ids) ||
            group.question_ids.length === 0
        ) {
            throw new Error("AI returned an incomplete question group");
        }
        for (const id of group.question_ids) {
            if (!questionIds.has(Number(id))) {
                throw new Error("AI returned an unknown question ID");
            }
            included.push(Number(id));
        }
    }
    if (
        included.length !== questionIds.size ||
        new Set(included).size !== questionIds.size
    ) {
        throw new Error("AI did not group every question exactly once");
    }
}

async function countDailyQuestions(departmentId, session, dateFrom, dateTo) {
    const [rows] = await pool.query(
        `SELECT COUNT(DISTINCT query_item.id) AS total
         FROM queries AS query_item
         INNER JOIN chat_messages AS question_message
           ON question_message.query_id = query_item.id
         INNER JOIN chat_conversations AS conversation
           ON conversation.id = question_message.conversation_id
         WHERE conversation.type = 'lecturer'
           AND conversation.lecturer_id IN (
               SELECT id FROM users
               WHERE role = 'lecturer' AND department_id = ?
           )
           AND query_item.session = ?
           AND query_item.created_at >= ? AND query_item.created_at < ?`,
        [departmentId, session, dateFrom, dateTo]
    );
    return Number(rows[0].total);
}

async function processSlot(lecturer, slot) {
    const [insertResult] = await pool.query(
        `INSERT IGNORE INTO adviser_ai_runs
         (lecturer_id, department_id, slot_key, status, started_at)
         VALUES (?, ?, ?, 'running', CURRENT_TIMESTAMP)`,
        [lecturer.id, lecturer.department_id, slot.key]
    );
    let runId = insertResult.insertId;
    if (insertResult.affectedRows === 0) {
        const [existingRuns] = await pool.query(
            `SELECT id, status, started_at
             FROM adviser_ai_runs
             WHERE lecturer_id = ? AND slot_key = ?
             LIMIT 1`,
            [lecturer.id, slot.key]
        );
        const existingRun = existingRuns[0];
        if (!existingRun) return;
        runId = existingRun.id;
        let reclaimResult;
        if (existingRun.status === "running") {
            if (Date.now() - new Date(existingRun.started_at).getTime() < 5 * 60 * 1000) return;
            [reclaimResult] = await pool.query(
                `UPDATE adviser_ai_runs
                 SET started_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND status = 'running'
                   AND started_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)`,
                [runId]
            );
        } else if (existingRun.status === "failed") {
            [reclaimResult] = await pool.query(
                `UPDATE adviser_ai_runs
                 SET status = 'running', started_at = CURRENT_TIMESTAMP,
                     completed_at = NULL, error_message = NULL
                 WHERE id = ? AND status = 'failed'
                   AND completed_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)`,
                [runId]
            );
        } else {
            return;
        }
        if (reclaimResult.affectedRows === 0) return;
        await writeSchedulerLog("run_recovery", `Resuming ${existingRun.status} run ${slot.key}`, lecturer.id);
    }

    try {
        const dailyStart = getSlotDate(new Date(slot.scheduledAt.getTime() + 1), 12).from;
        const dailyEnd = new Date(dailyStart.getTime() + 24 * 60 * 60 * 1000);
        const dailyCount = await countDailyQuestions(
            lecturer.department_id,
            lecturer.session,
            dailyStart,
            dailyEnd
        );
        const severity = dailyCount > 100 ? "critical" : "normal";
        if (severity === "critical") {
            console.error(
                `[CRITICAL] Adviser ${lecturer.id} received ${dailyCount} questions today; email alerting is not configured`
            );
        }

        const [existingGroupRows] = await pool.query(
            `SELECT question_ids
             FROM adviser_ai_groups
             WHERE run_id = ?`,
            [runId]
        );
        const alreadyGroupedIds = new Set();
        for (const group of existingGroupRows) {
            const ids = typeof group.question_ids === "string"
                ? JSON.parse(group.question_ids)
                : group.question_ids;
            if (Array.isArray(ids)) {
                for (const id of ids) alreadyGroupedIds.add(Number(id));
            }
        }
        const [questionCountRows] = await pool.query(
            `SELECT COUNT(DISTINCT query_item.id) AS total
             FROM queries AS query_item
             INNER JOIN chat_messages AS question_message
               ON question_message.query_id = query_item.id
             INNER JOIN chat_conversations AS conversation
               ON conversation.id = question_message.conversation_id
             WHERE conversation.type = 'lecturer'
               AND conversation.lecturer_id = ?
               AND query_item.session = ?
               AND query_item.created_at >= ?
               AND query_item.created_at < ?`,
            [lecturer.id, lecturer.session, slot.from, slot.scheduledAt]
        );
        const questionCount = Number(questionCountRows[0].total);
        await pool.query(
            `UPDATE adviser_ai_runs
             SET question_count = ?, severity = ?
             WHERE id = ?`,
            [questionCount, severity, runId]
        );

        if (questionCount > 0) {
            const config = await loadAiConfiguration();
            if (!config) throw new Error("GROQ_API_KEY is not configured in the API environment");
            let lastQuestionId = 0;
            let processedCount = alreadyGroupedIds.size;
            while (true) {
                const [questions] = await pool.query(
                    `SELECT DISTINCT query_item.id, query_item.subject, query_item.query,
                            query_item.query_type
                     FROM queries AS query_item
                     INNER JOIN chat_messages AS question_message
                       ON question_message.query_id = query_item.id
                     INNER JOIN chat_conversations AS conversation
                       ON conversation.id = question_message.conversation_id
                     WHERE conversation.type = 'lecturer'
                       AND conversation.lecturer_id = ?
                       AND query_item.session = ?
                       AND query_item.created_at >= ?
                       AND query_item.created_at < ?
                       AND query_item.id > ?
                       AND NOT EXISTS (
                           SELECT 1
                           FROM adviser_ai_groups AS existing_group
                           WHERE existing_group.run_id = ?
                             AND JSON_CONTAINS(
                               existing_group.question_ids,
                               CAST(query_item.id AS JSON)
                           )
                       )
                     ORDER BY query_item.id ASC
                     LIMIT 25`,
                    [lecturer.id, lecturer.session, slot.from, slot.scheduledAt, lastQuestionId, runId]
                );
                if (questions.length === 0) break;
                lastQuestionId = Number(questions[questions.length - 1].id);
                processedCount += questions.length;
                const groups = await callGroq(config, questions);
                for (const group of groups) {
                    await pool.query(
                        `INSERT INTO adviser_ai_groups
                         (run_id, title, question_ids, draft_reply, status)
                         VALUES (?, ?, ?, ?, 'pending')`,
                        [
                            runId,
                            group.title.trim().slice(0, 255),
                            JSON.stringify(group.question_ids.map(Number)),
                            group.draft_reply.trim(),
                        ]
                    );
                }
            }
            if (processedCount !== questionCount) {
                throw new Error(
                    `AI batch processed ${processedCount} of ${questionCount} questions`
                );
            }
        }

        await pool.query(
            `UPDATE adviser_ai_runs
             SET status = 'completed', completed_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [runId]
        );
        console.log(
            `[adviser-ai] ${slot.key}: processed ${questionCount} questions for ${lecturer.id}`
        );
    } catch (error) {
        await pool.query(
            `UPDATE adviser_ai_runs
             SET status = 'failed', error_message = ?, completed_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [String(error.message ?? error).slice(0, 1000), runId]
        );
        console.error(`[adviser-ai] ${slot.key} failed for ${lecturer.id}:`, error);
    }
}

export async function RunAdviserAiNow(lecturerId) {
    const [lecturers] = await pool.query(
        `SELECT id, department_id, session, is_verified
         FROM users
         WHERE id = ? AND role = 'lecturer'`,
        [lecturerId]
    );
    const lecturer = lecturers[0];
    if (!lecturer || !lecturer.is_verified) {
        throw new HttpError(403, "Verified lecturer access required");
    }
    if (!lecturer.department_id || !lecturer.session) {
        throw new HttpError(400, "Assign your lecturer account to a department and class session first");
    }

    const now = new Date();
    const parts = getLagosParts(now);
    const slot = {
        key: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${String(now.getSeconds()).padStart(2, "0")}`,
        scheduledAt: now,
        from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    };
    await processSlot(lecturer, slot);

    const [runs] = await pool.query(
        `SELECT id, status, question_count, error_message, started_at, completed_at
         FROM adviser_ai_runs
         WHERE lecturer_id = ? AND slot_key = ?
         LIMIT 1`,
        [lecturerId, slot.key]
    );
    const run = runs[0];
    if (!run) throw new HttpError(500, "AI test run could not be recorded");
    if (run.status === "failed") {
        throw new HttpError(502, "AI grouping failed. Review the failed run and API logs for details.");
    }
    return {
        data: {
            ...run,
            question_count: Number(run.question_count),
        },
    };
}

async function schedulerTick() {
    if (running) return;
    running = true;
    const now = new Date();
    try {
        const gapSeconds = Math.round((now.getTime() - lastTickAt) / 1000);
        if (gapSeconds > 180) {
            await writeSchedulerLog("sleep_catchup", `Scheduler gap ${gapSeconds}s; checking missed slots`);
        }
        lastTickAt = now.getTime();

        const parts = getLagosParts(now);
        const heartbeatKey = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}`;
        if (heartbeatKey !== lastHeartbeatKey) {
            lastHeartbeatKey = heartbeatKey;
            await writeSchedulerLog("heartbeat", `Scheduler active at ${heartbeatKey} (${TIME_ZONE})`);
        }

        if (!process.env.GROQ_API_KEY) return;

        const [lecturers] = await pool.query(
            `SELECT users.id, users.department_id, users.session
             FROM users
             WHERE users.role = 'lecturer'
               AND users.is_verified = TRUE
               AND users.department_id IS NOT NULL
               AND users.session IS NOT NULL`
        );
        for (const lecturer of lecturers) {
            const slots = await getDueSlots(lecturer.id, now);
            for (const slot of slots) await processSlot(lecturer, slot);
        }
    } catch (error) {
        console.error("[adviser-ai] Scheduler tick failed:", error);
    } finally {
        running = false;
    }
}

export async function startAdviserBatchScheduler() {
    if (interval) return;
    await writeSchedulerLog("startup", `Scheduler started; timezone=${TIME_ZONE}; hourly window=12-17`);
    const [lastHeartbeat] = await pool.query(
        `SELECT created_at FROM adviser_ai_scheduler_logs
         WHERE event_type = 'heartbeat' ORDER BY id DESC LIMIT 1`
    );
    if (lastHeartbeat[0]) {
        const downtime = Math.max(
            0,
            Math.round((Date.now() - new Date(lastHeartbeat[0].created_at).getTime()) / 1000)
        );
        await writeSchedulerLog("startup_gap", `Time since last heartbeat: ${downtime}s`);
    }
    await schedulerTick();
    interval = setInterval(() => {
        void schedulerTick();
    }, POLL_INTERVAL_MS);
    interval.unref?.();
}

export async function stopAdviserBatchScheduler() {
    if (interval) clearInterval(interval);
    interval = undefined;
    await writeSchedulerLog("shutdown", "Scheduler stopped");
}
