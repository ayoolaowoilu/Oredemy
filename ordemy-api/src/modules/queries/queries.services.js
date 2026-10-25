import pool from "../../config/database.js";
import { ValidateDeleteQuery, ValidateQuery } from "./queries.validation.js";


export async function SubmitQuery(queryData, userId) {
    ValidateQuery(queryData);
    const [result] = await pool.query(
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
    return {
        id: result.insertId,
        message: "Query submitted",
    };
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
