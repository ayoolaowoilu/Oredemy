import pool from "../../config/database.js";
import { HttpError } from "../../utils/http-error.js";
import { ValidateCourse, ValidateCourseId } from "./course.validation.js";

function currentAcademicSession(calendarOffset) {
    const startYear = new Date().getFullYear() - Number(calendarOffset ?? 0);
    return `${startYear}/${startYear + 1}`;
}

function levelFromSessions(admissionSession, academicSession) {
    const admission = /^(\d{4})\/(\d{4})$/.exec(admissionSession ?? "");
    const current = /^(\d{4})\/(\d{4})$/.exec(academicSession);
    if (
        !admission ||
        !current ||
        Number(admission[2]) !== Number(admission[1]) + 1 ||
        Number(current[2]) !== Number(current[1]) + 1
    ) {
        return null;
    }
    const level = (Number(current[1]) - Number(admission[1]) + 1) * 100;
    return level > 0 ? level : null;
}

async function getLecturerContext(lecturerId) {
    const [rows] = await pool.query(
        `SELECT users.department_id, schools.calendar_offset
         FROM users
         LEFT JOIN departments ON departments.id = users.department_id
         LEFT JOIN faculties ON faculties.id = departments.faculty_id
         LEFT JOIN schools ON schools.id = faculties.school_id
         WHERE users.id = ? AND users.role = 'lecturer' AND users.is_verified = TRUE`,
        [lecturerId]
    );
    if (!rows[0]) throw new HttpError(403, "Verified lecturer access required");
    if (!rows[0].department_id) {
        throw new HttpError(400, "Assign your lecturer account to a department first");
    }
    return {
        departmentId: Number(rows[0].department_id),
        academicSession: currentAcademicSession(rows[0].calendar_offset),
    };
}

export async function ListLecturerCourses(lecturerId) {
    const { departmentId, academicSession } = await getLecturerContext(lecturerId);
    const [rows] = await pool.query(
        `SELECT id, course_name, course_code, units, level, academic_session, created_at
         FROM department_courses
         WHERE department_id = ? AND academic_session = ?
         ORDER BY level, course_code`,
        [departmentId, academicSession]
    );
    return {
        data: rows.map((course) => ({
            ...course,
            units: Number(course.units),
            level: Number(course.level),
        })),
        academic_session: academicSession,
    };
}

export async function CreateLecturerCourse(lecturerId, body) {
    const course = ValidateCourse(body);
    const { departmentId, academicSession } = await getLecturerContext(lecturerId);
    const [result] = await pool.query(
        `INSERT INTO department_courses
         (lecturer_id, department_id, academic_session, level, course_name, course_code, units)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            lecturerId,
            departmentId,
            academicSession,
            course.level,
            course.course_name,
            course.course_code,
            course.units,
        ]
    );
    return {
        data: {
            id: result.insertId,
            ...course,
            academic_session: academicSession,
        },
        message: "Course added",
    };
}

export async function DeleteLecturerCourse(lecturerId, courseIdValue) {
    const courseId = ValidateCourseId(courseIdValue);
    const { departmentId } = await getLecturerContext(lecturerId);
    const [result] = await pool.query(
        `DELETE FROM department_courses
         WHERE id = ? AND lecturer_id = ? AND department_id = ?`,
        [courseId, lecturerId, departmentId]
    );
    if (result.affectedRows === 0) {
        throw new HttpError(404, "Course not found");
    }
    return { message: "Course deleted" };
}

export async function ListCurrentStudentCourses(studentId, role) {
    if (role !== "student") throw new HttpError(403, "Student access required");
    const [users] = await pool.query(
        `SELECT users.department_id,
                COALESCE(users.admission_session, users.session) AS admission_session,
                schools.calendar_offset
         FROM users
         LEFT JOIN departments ON departments.id = users.department_id
         LEFT JOIN faculties ON faculties.id = departments.faculty_id
         LEFT JOIN schools ON schools.id = faculties.school_id
         WHERE users.id = ? AND users.role = 'student'`,
        [studentId]
    );
    const student = users[0];
    if (!student) throw new HttpError(404, "Student profile not found");
    const academicSession = currentAcademicSession(student.calendar_offset);
    const level = levelFromSessions(student.admission_session, academicSession);
    if (!student.department_id || !level) {
        return { data: [], academic_session: academicSession, level };
    }
    const [rows] = await pool.query(
        `SELECT courses.id, courses.course_name, courses.course_code,
                courses.units, courses.level, courses.academic_session,
                lecturer.name AS lecturer_name
         FROM department_courses AS courses
         INNER JOIN users AS lecturer ON lecturer.id = courses.lecturer_id
         WHERE courses.department_id = ?
           AND courses.academic_session = ?
           AND courses.level = ?
         ORDER BY courses.course_code`,
        [student.department_id, academicSession, level]
    );
    return {
        data: rows.map((course) => ({
            ...course,
            units: Number(course.units),
            level: Number(course.level),
        })),
        academic_session: academicSession,
        level,
    };
}
