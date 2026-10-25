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
    return updateColumns(
        "queries",
        columns,
        queryEditData.values,
        "id = ? AND user_id = ?",
        [queryEditData.query_id, userId]
    );
}
