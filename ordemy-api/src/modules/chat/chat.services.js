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

async function FindOrCreateClassConversation(connection, departmentId, session) {
    const [existingRows] = await connection.query(
        `SELECT id
         FROM chat_conversations
         WHERE type = 'class' AND class_department_id = ? AND class_session = ?
         LIMIT 1
         FOR UPDATE`,
        [departmentId, session]
    );
    if (existingRows[0]) return existingRows[0].id;

    const conversationId = uuidv4();
    await connection.query(
        `INSERT INTO chat_conversations (id, type, class_department_id, class_session)
         VALUES (?, 'class', ?, ?)`,
        [conversationId, departmentId, session]
    );
    return conversationId;
}

export async function FindOrCreateLecturerConversation(connection, userId, student) {
    const [existingConversationRows] = await connection.query(
        `SELECT id
         FROM chat_conversations
         WHERE student_id = ? AND type = 'lecturer'
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [userId]
    );
    if (existingConversationRows[0]) return existingConversationRows[0].id;

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
           AND lecturer.session = ?
           AND (
                (? IS NOT NULL AND lecturer.department_id = ?)
                OR (? IS NOT NULL AND COALESCE(lecturer.faculty_id, lecturer_department.faculty_id) = ?)
           )
         ORDER BY (lecturer.department_id = ?) DESC,
                  lecturer.created_at ASC, lecturer.id ASC
         LIMIT 1`,
        [
             student.session,
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
    return conversationId;
}

async function LoadConversation(conversationId) {
    ValidateConversationId(conversationId);
    const [rows] = await pool.query(
        `SELECT conversation.id, conversation.type, conversation.student_id,
                conversation.lecturer_id, conversation.class_department_id,
                conversation.class_session, conversation.created_at,
                conversation.updated_at, student.name AS student_name,
                student.image AS student_image, lecturer.name AS lecturer_name,
                lecturer.image AS lecturer_image,
                class_department.name AS class_department
         FROM chat_conversations AS conversation
         LEFT JOIN users AS student ON student.id = conversation.student_id
         LEFT JOIN users AS lecturer ON lecturer.id = conversation.lecturer_id
         LEFT JOIN departments AS class_department
           ON class_department.id = conversation.class_department_id
         WHERE conversation.id = ?`,
        [conversationId]
    );
    if (!rows[0]) throw new HttpError(404, "Conversation not found");
    return rows[0];
}

export async function AuthorizeConversation(conversationId, user) {
    const [userRows] = await pool.query(
        "SELECT id, role, is_verified FROM users WHERE id = ?",
        [user.id]
    );
    const currentUser = userRows[0];
    if (!currentUser) throw new HttpError(401, "Authenticated user not found");
    currentUser.is_verified = Boolean(currentUser.is_verified);

    const conversation = await LoadConversation(conversationId);
    let isClassMember = false;
    if (conversation.type === "class") {
        if (currentUser.role === "student") {
            const [memberRows] = await pool.query(
                `SELECT id
                 FROM users
                 WHERE id = ? AND role = 'student'
                   AND department_id = ? AND session = ?`,
                [currentUser.id, conversation.class_department_id, conversation.class_session]
            );
            isClassMember = memberRows.length > 0;
        } else if (currentUser.role === "lecturer" && currentUser.is_verified) {
            const [memberRows] = await pool.query(
                `SELECT id
                 FROM users
                 WHERE id = ? AND role = 'lecturer' AND is_verified = TRUE
                   AND department_id = ? AND session = ?`,
                [currentUser.id, conversation.class_department_id, conversation.class_session]
            );
            isClassMember = memberRows.length > 0;
        }
    }
    const allowed =
        (currentUser.role === "student" && conversation.student_id === currentUser.id) ||
        (currentUser.role === "lecturer" &&
            conversation.type === "lecturer" &&
            conversation.lecturer_id === currentUser.id &&
            currentUser.is_verified) ||
        (currentUser.role === "admin" && conversation.type === "support") ||
        isClassMember;
    if (!allowed) throw new HttpError(403, "You cannot access this conversation");
    return conversation;
}

export async function CreateConversation(userId, type, requestedSession) {
    if (!["support", "lecturer", "class"].includes(type)) {
        throw new HttpError(400, "Conversation type must be support, lecturer, or class");
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [studentRows] = await connection.query(
            `SELECT id, role, is_verified, faculty_id, department_id, session
             FROM users
             WHERE id = ?
             FOR UPDATE`,
            [userId]
        );
        const student = studentRows[0];
        if (student?.role === "lecturer" && student.is_verified && type === "class") {
            if (!student.department_id || !student.session) {
                throw new HttpError(400, "Assign your lecturer account to a department and class session first");
            }
            if (typeof requestedSession !== "string" || !requestedSession.trim()) {
                throw new HttpError(400, "Select a session for the class group chat");
            }
            if (requestedSession.trim() !== student.session) {
                throw new HttpError(403, "You can only create class chats for your assigned session");
            }
            const [cohortRows] = await connection.query(
                `SELECT id FROM users
                 WHERE role = 'student' AND department_id = ? AND session = ?
                 LIMIT 1`,
                [student.department_id, requestedSession.trim()]
            );
            if (cohortRows.length === 0) {
                throw new HttpError(404, "No students found for that department session");
            }
            const conversationId = await FindOrCreateClassConversation(
                connection,
                student.department_id,
                requestedSession.trim()
            );
            await connection.commit();
            return { data: await LoadConversation(conversationId) };
        }
        if (!student || student.role !== "student") {
            throw new HttpError(403, "Only students can start conversations");
        }

        if (type === "support") {
            const conversationId = await FindOrCreateSupportConversation(connection, userId);
            await connection.commit();
            return { data: await LoadConversation(conversationId) };
        }

        if (type === "class") {
            if (!student.department_id || !student.session) {
                throw new HttpError(400, "Assign your department and academic session before joining the class chat");
            }
            const conversationId = await FindOrCreateClassConversation(
                connection,
                student.department_id,
                student.session
            );
            await connection.commit();
            return { data: await LoadConversation(conversationId) };
        }

        const conversationId = await FindOrCreateLecturerConversation(
            connection,
            userId,
            student
        );
        await connection.commit();
        return { data: await LoadConversation(conversationId) };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function ListClassSessions(user) {
    if (user.role !== "lecturer" || !user.is_verified) {
        throw new HttpError(403, "Verified lecturer access required");
    }
    const [lecturerRows] = await pool.query(
        `SELECT department_id, session FROM users
         WHERE id = ? AND role = 'lecturer' AND is_verified = TRUE`,
        [user.id]
    );
    const departmentId = lecturerRows[0]?.department_id;
    if (!departmentId) {
        throw new HttpError(400, "Assign your lecturer account to a department first");
    }
    if (!lecturerRows[0].session) {
        throw new HttpError(400, "Assign a class session to your lecturer account first");
    }
    const [rows] = await pool.query(
        `SELECT DISTINCT session
         FROM users
         WHERE role = 'student' AND department_id = ? AND session = ?
         ORDER BY session DESC`,
        [departmentId, lecturerRows[0].session]
    );
    return { data: rows.map(({ session }) => session) };
}

export async function ListConversations(user) {
    let condition;
    let values;
    if (user.role === "student") {
        const [studentRows] = await pool.query(
            "SELECT department_id, session FROM users WHERE id = ? AND role = 'student'",
            [user.id]
        );
        const student = studentRows[0];
        if (!student) throw new HttpError(403, "Chat access is not available for this account");
        condition = `(
            conversation.student_id = ?
            OR (
                conversation.type = 'class'
                AND conversation.class_department_id = ?
                AND conversation.class_session = ?
            )
        )`;
        values = [user.id, student.department_id, student.session];
    } else if (user.role === "lecturer" && user.is_verified) {
        const [lecturerRows] = await pool.query(
            "SELECT department_id, session FROM users WHERE id = ? AND role = 'lecturer' AND is_verified = TRUE",
            [user.id]
        );
        const lecturer = lecturerRows[0];
        if (!lecturer) throw new HttpError(403, "Chat access is not available for this account");
        condition = `(
            (conversation.type = 'lecturer' AND conversation.lecturer_id = ?)
            OR (
                conversation.type = 'class'
                AND conversation.class_department_id = ?
                AND conversation.class_session = ?
            )
        )`;
        values = [user.id, lecturer.department_id, lecturer.session];
    } else if (user.role === "admin") {
        condition = "conversation.type = 'support'";
        values = [];
    } else {
        throw new HttpError(403, "Chat access is not available for this account");
    }

    const [rows] = await pool.query(
        `SELECT conversation.id, conversation.type, conversation.student_id,
                conversation.lecturer_id, conversation.class_session,
                conversation.created_at, conversation.updated_at,
                student.name AS student_name, student.image AS student_image,
                lecturer.name AS lecturer_name, lecturer.image AS lecturer_image,
                class_department.name AS class_department,
                latest.body AS last_message, latest.created_at AS last_message_at
         FROM chat_conversations AS conversation
         LEFT JOIN users AS student ON student.id = conversation.student_id
         LEFT JOIN users AS lecturer ON lecturer.id = conversation.lecturer_id
         LEFT JOIN departments AS class_department
           ON class_department.id = conversation.class_department_id
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
                sender.name AS sender_name, sender.image AS sender_image,
                message.query_id, message.body, message.created_at
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
                    sender.name AS sender_name, sender.image AS sender_image,
                    message.query_id,
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
