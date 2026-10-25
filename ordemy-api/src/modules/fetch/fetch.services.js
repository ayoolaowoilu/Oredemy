import pool from "../../config/database.js";
import { HttpError } from "../../utils/http-error.js";
import { ValidateQuestionFetch } from "./fetch.validation.js";

const QUERY_TYPES = ["Results", "Facilities", "Timetable", "Other"];

export async function FetchLecturerQuestions(query, lecturerId) {
    const { session, scope, page, limit, queryType } = ValidateQuestionFetch(query);
    const [lecturers] = await pool.query(
        "SELECT faculty_id, department_id FROM users WHERE id = ? AND role = 'lecturer'",
        [lecturerId]
    );
    const lecturer = lecturers[0];
    if (!lecturer) {
        throw new HttpError(403, "This endpoint is available to lecturers only");
    }
    if (scope === "department" && !lecturer.department_id) {
        throw new HttpError(400, "Your lecturer account is not assigned to a department");
    }
    if (scope === "faculty" && !lecturer.faculty_id) {
        throw new HttpError(400, "Your lecturer account is not assigned to a faculty");
    }

    const scopeCondition = scope === "department"
        ? "question_user.department_id = ?"
        : "question_user.faculty_id = ?";
    const scopeId = scope === "department" ? lecturer.department_id : lecturer.faculty_id;
    const baseParameters = [session, scopeId];
    const queryTypeCondition = queryType ? " AND questions.query_type = ?" : "";
    const filteredParameters = queryType
        ? [...baseParameters, queryType]
        : baseParameters;
    const baseWhere = `questions.session = ? AND ${scopeCondition}`;
    const filteredWhere = `${baseWhere}${queryTypeCondition}`;

    const [totalRows] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM queries AS questions
         INNER JOIN users AS question_user ON question_user.id = questions.user_id
         WHERE ${filteredWhere}`,
        filteredParameters
    );

    const [sectionRows] = await pool.query(
        `SELECT questions.query_type AS section, COUNT(*) AS total
         FROM queries AS questions
         INNER JOIN users AS question_user ON question_user.id = questions.user_id
         WHERE ${baseWhere}
         GROUP BY questions.query_type`,
        baseParameters
    );

    const offset = (page - 1) * limit;
    if (!Number.isSafeInteger(offset)) {
        throw new HttpError(400, "Requested page is outside the supported range");
    }
    const departmentScopeFilter = scope === "department"
        ? "departments.id = ?"
        : "departments.faculty_id = ?";
    const departmentParameters = [scopeId, session, scopeId];
    const [departmentRows] = await pool.query(
        `SELECT departments.id AS department_id, departments.name AS department,
                COUNT(questions.id) AS total
         FROM departments
         LEFT JOIN users AS question_user
           ON question_user.department_id = departments.id AND ${scopeCondition}
         LEFT JOIN queries AS questions
           ON questions.user_id = question_user.id AND questions.session = ?
         WHERE ${departmentScopeFilter}
         GROUP BY departments.id, departments.name
         ORDER BY departments.name`,
        departmentParameters
    );

    const [questionRows] = await pool.query(
        `SELECT questions.id, questions.subject, questions.query,
                questions.query_type, questions.query_for, questions.session,
                questions.created_at, question_user.id AS student_id,
                question_user.name AS student_name, question_user.email AS student_email,
                departments.id AS department_id, departments.name AS department,
                faculties.id AS faculty_id, faculties.name AS faculty
         FROM queries AS questions
         INNER JOIN users AS question_user ON question_user.id = questions.user_id
         LEFT JOIN departments ON departments.id = question_user.department_id
         LEFT JOIN faculties ON faculties.id = question_user.faculty_id
         WHERE ${filteredWhere}
         ORDER BY questions.created_at DESC, questions.id DESC
         LIMIT ? OFFSET ?`,
        [...filteredParameters, limit, offset]
    );

    const total = Number(totalRows[0].total);
    const sectionTotal = sectionRows.reduce((sum, row) => sum + Number(row.total), 0);
    return {
        data: questionRows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        counts: {
            total: sectionTotal,
            bySection: QUERY_TYPES.map((section) => ({
                section,
                total: Number(sectionRows.find((row) => row.section === section)?.total ?? 0),
            })),
            byDepartment: departmentRows.map((row) => ({
                department_id: row.department_id,
                department: row.department,
                total: Number(row.total),
            })),
        },
    };
}
