import pool from "../../config/database.js";
import { HttpError } from "../../utils/http-error.js";
import { ValidateClassRepDecision, ValidateClassRepRequest } from "./class-rep.validation.js";

export async function SubmitClassRepRequest(studentId, body) {
    const message = ValidateClassRepRequest(body);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [students] = await connection.query(
            `SELECT department_id, session
             FROM users
             WHERE id = ? AND role = 'student'
             FOR UPDATE`,
            [studentId]
        );
        const student = students[0];
        if (!student) throw new HttpError(403, "Only students can request class-representative status");
        if (!student.department_id || !student.session) {
            throw new HttpError(400, "Assign your department and session before requesting class-representative status");
        }

        const [existing] = await connection.query(
            `SELECT id, status FROM class_rep_requests
             WHERE student_id = ? AND session = ? AND status IN ('pending', 'approved')
             LIMIT 1`,
            [studentId, student.session]
        );
        if (existing.length > 0) {
            throw new HttpError(
                409,
                existing[0].status === "approved"
                    ? "You are already an approved class representative for this session"
                    : "You already have a pending class-representative request"
            );
        }

        const [result] = await connection.query(
            `INSERT INTO class_rep_requests (student_id, department_id, session, message)
             VALUES (?, ?, ?, ?)`,
            [studentId, student.department_id, student.session, message]
        );
        await connection.commit();
        return {
            data: {
                id: result.insertId,
                student_id: studentId,
                department_id: student.department_id,
                session: student.session,
                message,
                status: "pending",
            },
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getVerifiedLecturerDepartment(lecturerId) {
    const [rows] = await pool.query(
        `SELECT department_id, session, is_verified
         FROM users
         WHERE id = ? AND role = 'lecturer'`,
        [lecturerId]
    );
    if (!rows[0]) throw new HttpError(403, "Lecturer access required");
    if (!rows[0].is_verified) {
        throw new HttpError(403, "Your lecturer account must be verified by an administrator first");
    }
    if (!rows[0].department_id) {
        throw new HttpError(400, "Your lecturer account is not assigned to a department");
    }
    if (!rows[0].session) {
        throw new HttpError(400, "Your lecturer account is not assigned to a class session");
    }
    return { departmentId: rows[0].department_id, session: rows[0].session };
}

export async function ListClassRepRequests(lecturerId) {
    const { departmentId, session } = await getVerifiedLecturerDepartment(lecturerId);
    const [rows] = await pool.query(
        `SELECT requests.id, requests.student_id, students.name AS student_name,
                requests.department_id, departments.name AS department,
                requests.session, requests.message, requests.status, requests.created_at
         FROM class_rep_requests AS requests
         INNER JOIN users AS students ON students.id = requests.student_id
         INNER JOIN departments ON departments.id = requests.department_id
         WHERE requests.department_id = ? AND requests.session = ?
           AND requests.status = 'pending'
         ORDER BY requests.created_at ASC, requests.id ASC`,
        [departmentId, session]
    );
    return { data: rows };
}

export async function ListMyClassRepRequests(studentId) {
    const [rows] = await pool.query(
        `SELECT requests.id, requests.department_id, departments.name AS department,
                requests.session, requests.message, requests.status,
                requests.decision_note, requests.created_at, requests.reviewed_at
         FROM class_rep_requests AS requests
         INNER JOIN departments ON departments.id = requests.department_id
         WHERE requests.student_id = ?
         ORDER BY requests.created_at DESC, requests.id DESC`,
        [studentId]
    );
    return { data: rows };
}

export async function ReviewClassRepRequest(lecturerId, requestId, body) {
    const { departmentId, session } = await getVerifiedLecturerDepartment(lecturerId);
    const { status, note } = ValidateClassRepDecision(body);
    const parsedId = Number(requestId);
    if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
        throw new HttpError(400, "A valid request ID is required");
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [requestRows] = await connection.query(
            `SELECT id, session, student_id
             FROM class_rep_requests
             WHERE id = ? AND department_id = ? AND session = ? AND status = 'pending'
             FOR UPDATE`,
            [parsedId, departmentId, session]
        );
        const request = requestRows[0];
        if (!request) throw new HttpError(404, "Pending class-representative request not found");

        if (status === "approved") {
            await connection.query(
                "SELECT id FROM departments WHERE id = ? FOR UPDATE",
                [departmentId]
            );
            const [approvedRows] = await connection.query(
                `SELECT id FROM class_rep_requests
                 WHERE department_id = ? AND session = ? AND status = 'approved'
                 LIMIT 1`,
                [departmentId, request.session]
            );
            if (approvedRows.length > 0) {
                throw new HttpError(409, "A class representative is already approved for this department and session");
            }
        }

        await connection.query(
            `UPDATE class_rep_requests
             SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, decision_note = ?
             WHERE id = ?`,
            [status, lecturerId, note, parsedId]
        );
        await connection.commit();
        return { message: `Class-representative request ${status}` };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
