import pool from "../../config/database.js";
import { UserEditValidation, ValidateQueryEditData } from "./edit.validation.js";

async function updateColumns(tableName, columns, values, whereClause, whereValues) {
    const assignments = columns.map((column) => `${column} = ?`).join(", ");
    const [rows] = await pool.query(
        `SELECT id FROM ${tableName} WHERE ${whereClause}`,
        whereValues
    );
    if (rows.length === 0) {
        const error = new Error("Record not found");
        error.statusCode = 404;
        throw error;
    }
    const [result] = await pool.query(
        `UPDATE ${tableName} SET ${assignments} WHERE ${whereClause}`,
        [...columns.map((column) => values[column]), ...whereValues]
    );
    return result;
}

export async function EditUserData(editData, userId) {
    const columns = UserEditValidation(editData);
    return updateColumns("users", columns, editData.values, "id = ?", [userId]);
}

export async function EditQueryData(queryEditData, userId) {
    const columns = ValidateQueryEditData(queryEditData);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [queryRows] = await connection.query(
            "SELECT subject, query FROM queries WHERE id = ? AND user_id = ? FOR UPDATE",
            [queryEditData.query_id, userId]
        );
        const existingQuery = queryRows[0];
        if (!existingQuery) {
            const error = new Error("Record not found");
            error.statusCode = 404;
            throw error;
        }

        const assignments = columns.map((column) => `${column} = ?`).join(", ");
        await connection.query(
            `UPDATE queries SET ${assignments} WHERE id = ? AND user_id = ?`,
            [
                ...columns.map((column) => queryEditData.values[column]),
                queryEditData.query_id,
                userId,
            ]
        );

        const [messageRows] = await connection.query(
            "SELECT conversation_id FROM chat_messages WHERE query_id = ?",
            [queryEditData.query_id]
        );
        if (messageRows[0]) {
            const subject = queryEditData.values.subject ?? existingQuery.subject;
            const query = queryEditData.values.query ?? existingQuery.query;
            await connection.query(
                "UPDATE chat_messages SET body = ? WHERE query_id = ?",
                [`Question: ${subject}\n\n${query}`, queryEditData.query_id]
            );
            await connection.query(
                "UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [messageRows[0].conversation_id]
            );
        }

        await connection.commit();
        return { affectedRows: 1 };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
