import pool from "../../config/database.js";
import { FindOrCreateSupportConversation } from "../chat/chat.services.js";
import { ValidateDeleteQuery, ValidateQuery } from "./queries.validation.js";
import { HttpError } from "../../utils/http-error.js";


export async function SubmitQuery(queryData, userId) {
    ValidateQuery(queryData);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [userRows] = await connection.query(
            "SELECT role, faculty_id, department_id FROM users WHERE id = ? FOR UPDATE",
            [userId]
        );
        const user = userRows[0];
        if (!user?.faculty_id || !user?.department_id) {
            const error = new Error(
                "Set your faculty and department in your profile before submitting a question"
            );
            error.statusCode = 400;
            throw error;
        }

        const [result] = await connection.query(
            `INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId,
                queryData.query_for ?? "Department",
                queryData.session,
                queryData.query,
                queryData.query_type ?? "Other",
                queryData.subject,
            ]
        );

        let chatConversationId;
        if (user.role === "student") {
            chatConversationId = await FindOrCreateSupportConversation(connection, userId);
            await connection.query(
                `INSERT INTO chat_messages (conversation_id, sender_id, query_id, body)
                 VALUES (?, ?, ?, ?)`,
                [
                    chatConversationId,
                    userId,
                    result.insertId,
                    `Question: ${queryData.subject}\n\n${queryData.query}`,
                ]
            );
            await connection.query(
                "UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [chatConversationId]
            );
        }

        await connection.commit();
        return {
            id: result.insertId,
            ...(chatConversationId ? { chat_conversation_id: chatConversationId } : {}),
            message: "Query submitted",
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function DeleteQuery(userId, queryId) {
    ValidateDeleteQuery(queryId);
    const [result] = await pool.query(
        "DELETE FROM queries WHERE user_id = ? AND id = ?",
        [userId, queryId]
    );
    if (result.affectedRows === 0) {
        const error = new Error("Query not found");
        error.statusCode = 404;
        throw error;
    }
    return { message: "Query deleted" };
}

export async function GetMyDashboard(userId, role) {
    if (role !== "student") {
        throw new HttpError(403, "Student dashboard is available to students only");
    }

    const [statsRows] = await pool.query(
        `SELECT COUNT(*) AS total_queries,
                COALESCE(SUM(
                    EXISTS (
                        SELECT 1
                        FROM chat_messages AS question_message
                        INNER JOIN chat_conversations AS conversation
                          ON conversation.id = question_message.conversation_id
                        WHERE question_message.query_id = queries.id
                          AND question_message.sender_id = queries.user_id
                          AND conversation.student_id = queries.user_id
                          AND conversation.type = 'support'
                          AND EXISTS (
                              SELECT 1
                              FROM chat_messages AS reply
                              INNER JOIN users AS responder ON responder.id = reply.sender_id
                              WHERE reply.conversation_id = conversation.id
                                AND reply.id > question_message.id
                                AND responder.role = 'admin'
                          )
                    )
                ), 0) AS queries_with_reply
         FROM queries
         WHERE user_id = ?`,
        [userId]
    );

    const [recentQueries] = await pool.query(
        `SELECT queries.id, queries.subject, queries.query_type,
                queries.session, queries.created_at,
                EXISTS (
                    SELECT 1
                    FROM chat_messages AS question_message
                    INNER JOIN chat_conversations AS conversation
                      ON conversation.id = question_message.conversation_id
                    WHERE question_message.query_id = queries.id
                      AND question_message.sender_id = queries.user_id
                      AND conversation.student_id = queries.user_id
                      AND conversation.type = 'support'
                      AND EXISTS (
                          SELECT 1
                          FROM chat_messages AS reply
                          INNER JOIN users AS responder ON responder.id = reply.sender_id
                          WHERE reply.conversation_id = conversation.id
                            AND reply.id > question_message.id
                            AND responder.role = 'admin'
                      )
                ) AS has_reply
         FROM queries
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 5`,
        [userId]
    );

    const totalQueries = Number(statsRows[0].total_queries);
    const queriesWithReply = Number(statsRows[0].queries_with_reply);
    return {
        stats: {
            totalQueries,
            queriesWithReply,
            awaitingReply: totalQueries - queriesWithReply,
        },
        recentQueries: recentQueries.map((query) => ({
            ...query,
            has_reply: Boolean(query.has_reply),
        })),
    };
}
