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
    const enrollmentFields = ["session", "faculty_id", "department_id"];
    if (columns.some((column) => enrollmentFields.includes(column))) {
        return updateUserProfile(editData, userId, columns);
    }
    return updateColumns("users", columns, editData.values, "id = ?", [userId]);
}

async function updateUserProfile(editData, userId, columns) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [userRows] = await connection.query(
            `SELECT role, faculty_id, department_id, session
             FROM users
             WHERE id = ?
             FOR UPDATE`,
            [userId]
        );
        const user = userRows[0];
        if (!user) {
            const error = new Error("Record not found");
            error.statusCode = 404;
            throw error;
        }
        if (user.role !== "student") {
            const error = new Error("Only students can update their academic session and department");
            error.statusCode = 403;
            throw error;
        }

        const values = { ...editData.values };
        let departmentId = values.department_id ?? user.department_id;
        let facultyId = values.faculty_id ?? user.faculty_id;
        if (Object.hasOwn(values, "department_id") && values.department_id === null) {
            departmentId = null;
        }
        if (Object.hasOwn(values, "faculty_id") && values.faculty_id === null) {
            facultyId = null;
        }

        if (departmentId !== null) {
            const [departmentRows] = await connection.query(
                "SELECT faculty_id FROM departments WHERE id = ?",
                [departmentId]
            );
            if (!departmentRows[0]) {
                const error = new Error("department_id does not identify an existing department");
                error.statusCode = 400;
                throw error;
            }
            const departmentFacultyId = departmentRows[0].faculty_id;
            if (!Object.hasOwn(values, "faculty_id") && departmentFacultyId !== facultyId) {
                facultyId = departmentFacultyId;
                if (!columns.includes("faculty_id")) columns.push("faculty_id");
                values.faculty_id = facultyId;
            } else if (facultyId !== departmentFacultyId) {
                const error = new Error("faculty_id must match the selected department");
                error.statusCode = 400;
                throw error;
            }
        }

        if (facultyId !== null) {
            const [facultyRows] = await connection.query(
                "SELECT id FROM faculties WHERE id = ?",
                [facultyId]
            );
            if (!facultyRows[0]) {
                const error = new Error("faculty_id does not identify an existing faculty");
                error.statusCode = 400;
                throw error;
            }
        }

        const assignments = columns.map((column) => `${column} = ?`).join(", ");
        await connection.query(
            `UPDATE users SET ${assignments} WHERE id = ?`,
            [...columns.map((column) => values[column]), userId]
        );
        await connection.commit();
        return { affectedRows: 1 };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
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
