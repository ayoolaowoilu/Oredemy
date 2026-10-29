import pool from "../../config/database.js";
import { HttpError } from "../../utils/http-error.js";
import {
    publishAdviserAiNotification,
    publishChatMessage,
} from "../chat/chat.socket.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

async function getLecturerDepartment(lecturerId) {
    const [rows] = await pool.query(
        `SELECT department_id FROM users
         WHERE id = ? AND role = 'lecturer' AND is_verified = TRUE`,
        [lecturerId]
    );
    if (!rows[0]) throw new HttpError(403, "Verified lecturer access required");
    if (!rows[0].department_id) {
        throw new HttpError(400, "Assign your lecturer account to a department first");
    }
    return rows[0].department_id;
}

export async function loadAiConfiguration() {
    if (!process.env.GROQ_API_KEY) return null;
    return {
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
    };
}

export async function GetAdviserDashboard(lecturerId) {
    const departmentId = await getLecturerDepartment(lecturerId);
    const [lecturerRows] = await pool.query(
        "SELECT session FROM users WHERE id = ? AND role = 'lecturer'",
        [lecturerId]
    );
    const session = lecturerRows[0]?.session;
    if (!session) throw new HttpError(400, "Your lecturer account is not assigned to a class session");
    const [questionRows] = await pool.query(
        `SELECT COUNT(DISTINCT query_item.id) AS total_questions,
                SUM(query_item.created_at >= CURDATE()) AS today_questions,
                SUM(NOT EXISTS (
                    SELECT 1
                    FROM chat_messages AS question_message
                    INNER JOIN chat_conversations AS conversation
                      ON conversation.id = question_message.conversation_id
                    INNER JOIN chat_messages AS reply
                      ON reply.conversation_id = conversation.id
                     AND reply.id > question_message.id
                    WHERE question_message.query_id = query_item.id
                      AND reply.sender_id = ?
                )) AS awaiting_reply
         FROM queries AS query_item
         INNER JOIN users AS student ON student.id = query_item.user_id
         WHERE student.department_id = ?
           AND query_item.session = ?
           AND query_item.query_for IN ('Department', 'Faculty')`,
        [lecturerId, departmentId, session]
    );
    const [requestRows] = await pool.query(
        `SELECT COUNT(*) AS pending_requests
         FROM class_rep_requests
         WHERE department_id = ? AND session = ? AND status = 'pending'`,
        [departmentId, session]
    );
    const [criticalRows] = await pool.query(
        `SELECT COUNT(*) AS today_count
         FROM queries AS query_item
         INNER JOIN users AS student ON student.id = query_item.user_id
         WHERE student.department_id = ?
           AND query_item.session = ?
           AND query_item.created_at >= CURDATE()`,
        [departmentId, session]
    );
    return {
        stats: {
            totalQuestions: Number(questionRows[0].total_questions ?? 0),
            todayQuestions: Number(criticalRows[0].today_count ?? 0),
            awaitingReply: Number(questionRows[0].awaiting_reply ?? 0),
            pendingClassRepRequests: Number(requestRows[0].pending_requests ?? 0),
            dailyVolumeCritical: Number(criticalRows[0].today_count ?? 0) > 100,
        },
    };
}

export async function ListAiRuns(lecturerId) {
    const departmentId = await getLecturerDepartment(lecturerId);
    const [runs] = await pool.query(
        `SELECT id, slot_key, status, question_count, severity, error_message,
                started_at, completed_at
         FROM adviser_ai_runs
         WHERE lecturer_id = ? AND department_id = ?
         ORDER BY slot_key DESC
         LIMIT 24`,
        [lecturerId, departmentId]
    );
    const runIds = runs.map((run) => run.id);
    let groups = [];
    if (runIds.length > 0) {
        const [groupRows] = await pool.query(
            `SELECT question_group.id, question_group.run_id, question_group.title,
                    question_group.question_ids, question_group.draft_reply,
                    question_group.status, question_group.auto_sent,
                    question_group.reply_rule_id AS matched_reply_rule_id,
                    source_rule.id AS active_reply_rule_id,
                    source_rule.reply_text AS active_reply_text,
                    question_group.created_at, question_group.sent_at
             FROM adviser_ai_groups AS question_group
             LEFT JOIN adviser_ai_reply_rules AS source_rule
               ON source_rule.source_group_id = question_group.id
              AND source_rule.is_active = TRUE
             WHERE question_group.run_id IN (${runIds.map(() => "?").join(",")})
             ORDER BY question_group.created_at DESC, question_group.id DESC`,
            runIds
        );
        groups = groupRows.map((group) => ({
            ...group,
            auto_sent: Boolean(group.auto_sent),
            has_active_reply_rule: group.active_reply_rule_id !== null,
            question_ids: typeof group.question_ids === "string"
                ? JSON.parse(group.question_ids)
                : group.question_ids,
        }));
    }
    return {
        data: runs.map((run) => ({
            ...run,
            groups: groups.filter((group) => group.run_id === run.id),
        })),
    };
}

export async function ListSchedulerLogs(lecturerId) {
    await getLecturerDepartment(lecturerId);
    const [rows] = await pool.query(
        `SELECT event_type, details, created_at
         FROM adviser_ai_scheduler_logs
         WHERE lecturer_id = ? OR lecturer_id IS NULL
         ORDER BY id DESC
         LIMIT 50`,
        [lecturerId]
    );
    return { data: rows };
}

export async function ListAiNotifications(lecturerId) {
    const [rows] = await pool.query(
        `SELECT id, run_id, message, is_read, created_at
         FROM adviser_ai_notifications
         WHERE lecturer_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 30`,
        [lecturerId]
    );
    return {
        data: rows.map((row) => ({ ...row, is_read: Boolean(row.is_read) })),
        unread_count: rows.filter((row) => !row.is_read).length,
    };
}

export async function MarkAiNotificationRead(lecturerId, notificationIdValue) {
    const notificationId = parseId(notificationIdValue, "notificationId");
    const [result] = await pool.query(
        `UPDATE adviser_ai_notifications
         SET is_read = TRUE
         WHERE id = ? AND lecturer_id = ?`,
        [notificationId, lecturerId]
    );
    if (result.affectedRows === 0) {
        const [rows] = await pool.query(
            "SELECT id FROM adviser_ai_notifications WHERE id = ? AND lecturer_id = ?",
            [notificationId, lecturerId]
        );
        if (!rows[0]) throw new HttpError(404, "AI notification not found");
    }
    return { message: "Notification marked as read" };
}

export async function MarkAllAiNotificationsRead(lecturerId) {
    await pool.query(
        `UPDATE adviser_ai_notifications
         SET is_read = TRUE
         WHERE lecturer_id = ? AND is_read = FALSE`,
        [lecturerId]
    );
    return { message: "Notifications marked as read" };
}

export async function CreateAiRunNotification(
    lecturerId,
    runId,
    groupCount,
    autoSentCount,
) {
    if (groupCount < 1) return;
    const message = autoSentCount > 0
        ? `AI grouped ${groupCount} similar question${groupCount === 1 ? "" : "s"} and automatically answered ${autoSentCount} group${autoSentCount === 1 ? "" : "s"}.`
        : `AI grouped similar student questions into ${groupCount} group${groupCount === 1 ? "" : "s"} for your review.`;
    const [result] = await pool.query(
        `INSERT IGNORE INTO adviser_ai_notifications (lecturer_id, run_id, message)
         VALUES (?, ?, ?)`,
        [lecturerId, runId, message]
    );
    if (result.affectedRows === 0) return;
    publishAdviserAiNotification(lecturerId, {
        id: result.insertId,
        run_id: runId,
        message,
        is_read: false,
        created_at: new Date().toISOString(),
    });
}

function parseId(value, field) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new HttpError(400, `${field} must be a positive integer`);
    }
    return id;
}

export async function ReviewAiGroup(lecturerId, runIdValue, groupIdValue, body) {
    const runId = parseId(runIdValue, "runId");
    const groupId = parseId(groupIdValue, "groupId");
    if (typeof body?.draftReply !== "string" || !body.draftReply.trim() || body.draftReply.length > 10000) {
        throw new HttpError(400, "draftReply must contain 1 to 10000 characters");
    }
    const [result] = await pool.query(
        `UPDATE adviser_ai_groups AS question_group
         INNER JOIN adviser_ai_runs AS batch_run ON batch_run.id = question_group.run_id
         SET question_group.draft_reply = ?
         WHERE question_group.id = ? AND batch_run.id = ?
           AND batch_run.lecturer_id = ? AND question_group.status = 'pending'`,
        [body.draftReply.trim(), groupId, runId, lecturerId]
    );
    if (result.affectedRows === 0) {
        throw new HttpError(404, "Pending AI draft not found");
    }
    return { message: "Draft updated" };
}

export async function SaveAiReplyRule(lecturerId, runIdValue, groupIdValue, body) {
    const runId = parseId(runIdValue, "runId");
    const groupId = parseId(groupIdValue, "groupId");
    if (
        typeof body?.replyText !== "string" ||
        !body.replyText.trim() ||
        body.replyText.length > 10000
    ) {
        throw new HttpError(400, "replyText must contain 1 to 10000 characters");
    }

    const [groupRows] = await pool.query(
        `SELECT question_group.title, question_group.question_ids
         FROM adviser_ai_groups AS question_group
         INNER JOIN adviser_ai_runs AS batch_run
           ON batch_run.id = question_group.run_id
         WHERE question_group.id = ? AND batch_run.id = ?
           AND batch_run.lecturer_id = ?`,
        [groupId, runId, lecturerId]
    );
    const group = groupRows[0];
    if (!group) throw new HttpError(404, "AI question group not found");
    const questionIds = typeof group.question_ids === "string"
        ? JSON.parse(group.question_ids)
        : group.question_ids;
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
        throw new HttpError(500, "AI question group has no linked questions");
    }

    const [exampleRows] = await pool.query(
        `SELECT DISTINCT query_item.id, query_item.subject, query_item.query,
                query_item.query_type
         FROM queries AS query_item
         INNER JOIN chat_messages AS question_message
           ON question_message.query_id = query_item.id
         INNER JOIN chat_conversations AS conversation
           ON conversation.id = question_message.conversation_id
         WHERE conversation.type = 'lecturer'
           AND conversation.lecturer_id = ?
           AND query_item.id IN (${questionIds.map(() => "?").join(",")})
         ORDER BY query_item.id`,
        [lecturerId, ...questionIds]
    );
    if (exampleRows.length !== questionIds.length) {
        throw new HttpError(404, "Some source questions are no longer available");
    }
    const examples = exampleRows.map((question) => ({
        subject: question.subject,
        question: question.query,
        category: question.query_type,
    }));
    await pool.query(
        `INSERT INTO adviser_ai_reply_rules
         (lecturer_id, source_group_id, title, examples, reply_text, is_active)
         VALUES (?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           examples = VALUES(examples),
           reply_text = VALUES(reply_text),
           is_active = TRUE,
           updated_at = CURRENT_TIMESTAMP`,
        [
            lecturerId,
            groupId,
            group.title,
            JSON.stringify(examples),
            body.replyText.trim(),
        ]
    );
    return {
        message: "Future questions the AI identifies as this same issue will receive this reply.",
    };
}

export async function CancelAiReplyRule(lecturerId, runIdValue, groupIdValue) {
    const runId = parseId(runIdValue, "runId");
    const groupId = parseId(groupIdValue, "groupId");
    const [result] = await pool.query(
        `UPDATE adviser_ai_reply_rules AS reply_rule
         INNER JOIN adviser_ai_groups AS source_group
           ON source_group.id = reply_rule.source_group_id
         INNER JOIN adviser_ai_runs AS batch_run
           ON batch_run.id = source_group.run_id
         SET reply_rule.is_active = FALSE,
             reply_rule.updated_at = CURRENT_TIMESTAMP
         WHERE source_group.id = ? AND batch_run.id = ?
           AND batch_run.lecturer_id = ? AND reply_rule.is_active = TRUE`,
        [groupId, runId, lecturerId]
    );
    if (result.affectedRows === 0) {
        const [rows] = await pool.query(
            `SELECT reply_rule.id
             FROM adviser_ai_reply_rules AS reply_rule
             INNER JOIN adviser_ai_groups AS source_group
               ON source_group.id = reply_rule.source_group_id
             INNER JOIN adviser_ai_runs AS batch_run
               ON batch_run.id = source_group.run_id
             WHERE source_group.id = ? AND batch_run.id = ?
               AND batch_run.lecturer_id = ?`,
            [groupId, runId, lecturerId]
        );
        if (!rows[0]) throw new HttpError(404, "Automatic reply rule not found");
    }
    return { message: "Automatic replies for this question group are cancelled." };
}

export async function SendAiGroup(
    lecturerId,
    runIdValue,
    groupIdValue,
    { automated = false } = {}
) {
    const runId = parseId(runIdValue, "runId");
    const groupId = parseId(groupIdValue, "groupId");
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [groupRows] = await connection.query(
            `SELECT question_group.id, question_group.question_ids,
                    question_group.draft_reply, question_group.status,
                    question_group.reply_rule_id, reply_rule.reply_text,
                    reply_rule.is_active AS reply_rule_active
             FROM adviser_ai_groups AS question_group
             INNER JOIN adviser_ai_runs AS batch_run ON batch_run.id = question_group.run_id
             LEFT JOIN adviser_ai_reply_rules AS reply_rule
               ON reply_rule.id = question_group.reply_rule_id
             WHERE question_group.id = ? AND batch_run.id = ?
               AND batch_run.lecturer_id = ?
             FOR UPDATE`,
            [groupId, runId, lecturerId]
        );
        const group = groupRows[0];
        if (!group || group.status !== "pending") {
            throw new HttpError(404, "Pending AI draft not found");
        }
        if (automated && (!group.reply_rule_id || !group.reply_rule_active)) {
            await connection.commit();
            return { skipped: true, recipients: 0 };
        }
        const questionIds = typeof group.question_ids === "string"
            ? JSON.parse(group.question_ids)
            : group.question_ids;
        if (!Array.isArray(questionIds) || questionIds.length === 0) {
            throw new HttpError(500, "AI draft has no linked questions");
        }
        const [conversationRows] = await connection.query(
            `SELECT DISTINCT conversation.id
             FROM chat_conversations AS conversation
             INNER JOIN chat_messages AS question_message
               ON question_message.conversation_id = conversation.id
             WHERE conversation.type = 'lecturer'
               AND conversation.lecturer_id = ?
               AND question_message.query_id IN (${questionIds.map(() => "?").join(",")})`,
            [lecturerId, ...questionIds]
        );
        if (conversationRows.length === 0) {
            throw new HttpError(404, "No adviser conversations found for this draft");
        }
        for (const conversation of conversationRows) {
            const [messageResult] = await connection.query(
                `INSERT INTO chat_messages (conversation_id, sender_id, body)
                 VALUES (?, ?, ?)`,
                [
                    conversation.id,
                    lecturerId,
                    automated
                        ? `[AI-assisted automatic response]\n\n${group.reply_text}`
                        : group.draft_reply,
                ]
            );
            await connection.query(
                "UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [conversation.id]
            );
            const [messageRows] = await connection.query(
                `SELECT message.id, message.conversation_id, message.sender_id,
                        lecturer.name AS sender_name, lecturer.image AS sender_image,
                        message.query_id,
                        message.body, message.created_at
                 FROM chat_messages AS message
                 INNER JOIN users AS lecturer ON lecturer.id = message.sender_id
                 WHERE message.id = ?`,
                [messageResult.insertId]
            );
            conversation.message = messageRows[0];
        }
        await connection.query(
            `UPDATE adviser_ai_groups
             SET status = 'sent', sent_at = CURRENT_TIMESTAMP, auto_sent = ?
             WHERE id = ?`,
                [automated, groupId]
        );
        await connection.commit();
        for (const conversation of conversationRows) {
            void publishChatMessage(conversation.message).catch((error) => {
                console.error("[chat] Could not publish reviewed AI reply:", error);
            });
        }
        return { message: "Reviewed reply sent to grouped students", recipients: conversationRows.length };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export { GROQ_BASE_URL, DEFAULT_MODEL };
