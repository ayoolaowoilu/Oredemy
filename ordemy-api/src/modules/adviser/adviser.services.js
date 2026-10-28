import pool from "../../config/database.js";
import { HttpError } from "../../utils/http-error.js";
import { publishChatMessage } from "../chat/chat.socket.js";

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

export async function loadAiConfiguration(lecturerId) {
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
            `SELECT id, run_id, title, question_ids, draft_reply, status,
                    created_at, sent_at
             FROM adviser_ai_groups
             WHERE run_id IN (${runIds.map(() => "?").join(",")})
             ORDER BY created_at DESC, id DESC`,
            runIds
        );
        groups = groupRows.map((group) => ({
            ...group,
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

export async function SendAiGroup(lecturerId, runIdValue, groupIdValue) {
    const runId = parseId(runIdValue, "runId");
    const groupId = parseId(groupIdValue, "groupId");
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [groupRows] = await connection.query(
            `SELECT question_group.id, question_group.question_ids,
                    question_group.draft_reply, question_group.status
             FROM adviser_ai_groups AS question_group
             INNER JOIN adviser_ai_runs AS batch_run ON batch_run.id = question_group.run_id
             WHERE question_group.id = ? AND batch_run.id = ?
               AND batch_run.lecturer_id = ?
             FOR UPDATE`,
            [groupId, runId, lecturerId]
        );
        const group = groupRows[0];
        if (!group || group.status !== "pending") {
            throw new HttpError(404, "Pending AI draft not found");
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
                [conversation.id, lecturerId, group.draft_reply]
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
            `UPDATE adviser_ai_groups SET status = 'sent', sent_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [groupId]
        );
        await connection.commit();
        for (const conversation of conversationRows) {
            publishChatMessage(conversation.message);
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
