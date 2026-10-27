import pool from "../../config/database.js";
import { HttpError } from "../../utils/http-error.js";
import { verifyToken } from "../../utils/jwt.js";
import { v4 as uuidv4 } from "uuid";

const MESSAGE_MAX_LENGTH = 5000;
const CONVERSATION_ID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ValidateConversationId(conversationId) {
    if (typeof conversationId !== "string" || !CONVERSATION_ID_PATTERN.test(conversationId)) {
        throw new HttpError(400, "A valid conversation ID is required");
    }
}

function ValidateMessage(body) {
    if (typeof body !== "string" || !body.trim()) {
        throw new HttpError(400, "Message body is required");
    }
    if (body.trim().length > MESSAGE_MAX_LENGTH) {
        throw new HttpError(400, `Message must be at most ${MESSAGE_MAX_LENGTH} characters`);
    }
    return body.trim();
}

export async function FindOrCreateSupportConversation(connection, studentId) {
    const [studentRows] = await connection.query(
        "SELECT role FROM users WHERE id = ? FOR UPDATE",
        [studentId]
    );
    if (studentRows[0]?.role !== "student") {
        throw new HttpError(403, "Only students can open a customer support conversation");
    }

    const [existingRows] = await connection.query(
        `SELECT id
         FROM chat_conversations
         WHERE student_id = ? AND type = 'support'
         LIMIT 1
         FOR UPDATE`,
        [studentId]
    );
    if (existingRows[0]) return existingRows[0].id;

    const conversationId = uuidv4();
    await connection.query(
        `INSERT INTO chat_conversations (id, type, student_id)
         VALUES (?, 'support', ?)`,
        [conversationId, studentId]
    );
    return conversationId;
}

async function LoadConversation(conversationId) {
    ValidateConversationId(conversationId);
    const [rows] = await pool.query(
        `SELECT id, type, student_id, lecturer_id, created_at, updated_at
         FROM chat_conversations
         WHERE id = ?`,
        [conversationId]
    );
    if (!rows[0]) throw new HttpError(404, "Conversation not found");
    return rows[0];
}

export async function AuthorizeConversation(conversationId, user) {
    const conversation = await LoadConversation(conversationId);
    const allowed =
        (user.role === "student" && conversation.student_id === user.id) ||
        (user.role === "lecturer" &&
            conversation.type === "lecturer" &&
            conversation.lecturer_id === user.id &&
            user.is_verified) ||
        (user.role === "admin" && conversation.type === "support");
    if (!allowed) throw new HttpError(403, "You cannot access this conversation");
    return conversation;
}

export async function CreateConversation(userId, type) {
    if (!["support", "lecturer"].includes(type)) {
        throw new HttpError(400, "Conversation type must be support or lecturer");
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [studentRows] = await connection.query(
            `SELECT id, role, faculty_id, department_id
             FROM users
             WHERE id = ?
             FOR UPDATE`,
            [userId]
        );
        const student = studentRows[0];
        if (!student || student.role !== "student") {
            throw new HttpError(403, "Only students can start conversations");
        }

        if (type === "support") {
            const conversationId = await FindOrCreateSupportConversation(connection, userId);
            await connection.commit();
            return { data: await LoadConversation(conversationId) };
        }

        const [existingConversationRows] = await connection.query(
            `SELECT id
             FROM chat_conversations
             WHERE student_id = ? AND type = 'lecturer'
             ORDER BY created_at DESC
             LIMIT 1
             FOR UPDATE`,
            [userId]
        );
        if (existingConversationRows[0]) {
            await connection.commit();
            return { data: await LoadConversation(existingConversationRows[0].id) };
        }

        const facultyId = student.faculty_id ??
            (student.department_id
                ? (await connection.query(
                    "SELECT faculty_id FROM departments WHERE id = ?",
                    [student.department_id]
                ))[0][0]?.faculty_id
                : null);
        if (!student.department_id && !facultyId) {
            throw new HttpError(400, "Assign your department or faculty before starting a lecturer chat");
        }

        const [lecturerRows] = await connection.query(
            `SELECT lecturer.id
             FROM users AS lecturer
             LEFT JOIN departments AS lecturer_department
               ON lecturer_department.id = lecturer.department_id
             WHERE lecturer.role = 'lecturer'
               AND lecturer.is_verified = TRUE
               AND (
                    (? IS NOT NULL AND lecturer.department_id = ?)
                    OR (? IS NOT NULL AND COALESCE(lecturer.faculty_id, lecturer_department.faculty_id) = ?)
               )
             ORDER BY (lecturer.department_id = ?) DESC,
                      lecturer.created_at ASC, lecturer.id ASC
             LIMIT 1`,
            [
                student.department_id,
                student.department_id,
                facultyId,
                facultyId,
                student.department_id,
            ]
        );
        const lecturer = lecturerRows[0];
        if (!lecturer) {
            throw new HttpError(404, "No verified lecturer is available for your department or faculty");
        }

        const [existingRows] = await connection.query(
            `SELECT id
             FROM chat_conversations
             WHERE student_id = ? AND lecturer_id = ? AND type = 'lecturer'
             LIMIT 1
             FOR UPDATE`,
            [userId, lecturer.id]
        );
        const conversationId = existingRows[0]?.id ?? uuidv4();
        if (!existingRows[0]) {
            await connection.query(
                `INSERT INTO chat_conversations (id, type, student_id, lecturer_id)
                 VALUES (?, 'lecturer', ?, ?)`,
                [conversationId, userId, lecturer.id]
            );
        }
        await connection.commit();
        return { data: await LoadConversation(conversationId) };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function ListConversations(user) {
    let condition;
    let values;
    if (user.role === "student") {
        condition = "conversation.student_id = ?";
        values = [user.id];
    } else if (user.role === "lecturer" && user.is_verified) {
        condition = "conversation.type = 'lecturer' AND conversation.lecturer_id = ?";
        values = [user.id];
    } else if (user.role === "admin") {
        condition = "conversation.type = 'support'";
        values = [];
    } else {
        throw new HttpError(403, "Chat access is not available for this account");
    }

    const [rows] = await pool.query(
        `SELECT conversation.id, conversation.type, conversation.student_id,
                conversation.lecturer_id, conversation.created_at, conversation.updated_at,
                student.name AS student_name, lecturer.name AS lecturer_name,
                latest.body AS last_message, latest.created_at AS last_message_at
         FROM chat_conversations AS conversation
         INNER JOIN users AS student ON student.id = conversation.student_id
         LEFT JOIN users AS lecturer ON lecturer.id = conversation.lecturer_id
         LEFT JOIN chat_messages AS latest
           ON latest.id = (
                SELECT message.id
                FROM chat_messages AS message
                WHERE message.conversation_id = conversation.id
                ORDER BY message.id DESC
                LIMIT 1
           )
         WHERE ${condition}
         ORDER BY COALESCE(latest.created_at, conversation.updated_at) DESC`,
        values
    );
    return { data: rows };
}

export async function ListMessages(conversationId, user, query = {}) {
    await AuthorizeConversation(conversationId, user);
    const limit = query.limit === undefined ? 50 : Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new HttpError(400, "limit must be an integer between 1 and 100");
    }
    const beforeId = query.before === undefined ? null : Number(query.before);
    if (beforeId !== null && (!Number.isSafeInteger(beforeId) || beforeId <= 0)) {
        throw new HttpError(400, "before must be a positive message ID");
    }

    const [rows] = await pool.query(
        `SELECT message.id, message.conversation_id, message.sender_id,
                sender.name AS sender_name, message.query_id, message.body, message.created_at
         FROM chat_messages AS message
         INNER JOIN users AS sender ON sender.id = message.sender_id
         WHERE message.conversation_id = ?
           AND (? IS NULL OR message.id < ?)
         ORDER BY message.id DESC
         LIMIT ?`,
        [conversationId, beforeId, beforeId, limit]
    );
    return { data: rows.reverse() };
}

export async function SendMessage(conversationId, user, body) {
    const messageBody = ValidateMessage(body);
    const conversation = await AuthorizeConversation(conversationId, user);
    if (
        (conversation.type === "support" && user.role !== "student" && user.role !== "admin") ||
        (conversation.type === "lecturer" && user.role !== "student" && user.role !== "lecturer")
    ) {
        throw new HttpError(403, "Your account cannot send messages in this conversation");
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(
            `INSERT INTO chat_messages (conversation_id, sender_id, body)
             VALUES (?, ?, ?)`,
            [conversationId, user.id, messageBody]
        );
        await connection.query(
            "UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [conversationId]
        );
        const [rows] = await connection.query(
            `SELECT message.id, message.conversation_id, message.sender_id,
                    sender.name AS sender_name, message.query_id,
                    message.body, message.created_at
             FROM chat_messages AS message
             INNER JOIN users AS sender ON sender.id = message.sender_id
             WHERE message.id = ?`,
            [result.insertId]
        );
        await connection.commit();
        return rows[0];
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function AuthenticateChatToken(token) {
    if (typeof token !== "string" || !token) {
        throw new HttpError(401, "Authentication token required");
    }

    let payload;
    try {
        payload = verifyToken(token);
    } catch {
        throw new HttpError(401, "Invalid or expired token");
    }
    const [rows] = await pool.query(
        "SELECT id, name, role, is_verified FROM users WHERE id = ?",
        [payload.id]
    );
    const user = rows[0];
    if (!user) throw new HttpError(401, "Authenticated user not found");
    if (user.role === "lecturer" && !user.is_verified) {
        throw new HttpError(403, "Your lecturer account must be verified by an administrator first");
    }
    if (!["student", "lecturer", "admin"].includes(user.role)) {
        throw new HttpError(403, "Chat access is not available for this account");
    }
    return { ...user, is_verified: Boolean(user.is_verified) };
}
