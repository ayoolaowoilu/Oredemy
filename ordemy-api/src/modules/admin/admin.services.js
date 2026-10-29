import pool from "../../config/database.js";
import { HttpError } from "../../utils/http-error.js";

const resources = {
    schools: {
        table: "schools",
        fields: ["name", "calendar_offset"],
        required: ["name"],
    },
    faculties: {
        table: "faculties",
        fields: ["name", "school_id"],
        required: ["name", "school_id"],
        parent: { table: "schools", field: "school_id" },
    },
    departments: {
        table: "departments",
        fields: ["name", "faculty_id"],
        required: ["name", "faculty_id"],
        parent: { table: "faculties", field: "faculty_id" },
    },
};

function getResource(resourceName) {
    if (!Object.prototype.hasOwnProperty.call(resources, resourceName)) {
        throw new HttpError(404, "Admin resource not found");
    }
    return resources[resourceName];
}

function validateId(id) {
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
        throw new HttpError(400, "A valid positive integer ID is required");
    }
    return parsedId;
}

function validateValues(resource, values, { partial = false } = {}) {
    if (!values || typeof values !== "object" || Array.isArray(values)) {
        throw new HttpError(400, "A JSON object is required");
    }
    const keys = Object.keys(values);
    if (keys.some((key) => !resource.fields.includes(key))) {
        throw new HttpError(400, "One or more fields are not editable");
    }
    if (keys.length === 0) throw new HttpError(400, "At least one field is required");
    if (!partial && resource.required.some((key) => values[key] === undefined)) {
        throw new HttpError(400, "Required fields are missing");
    }
    if ("name" in values && (typeof values.name !== "string" || !values.name.trim() || values.name.length > 255)) {
        throw new HttpError(400, "name must be a non-empty string of at most 255 characters");
    }
    for (const key of ["school_id", "faculty_id", "calendar_offset"]) {
        if (key in values && !Number.isInteger(values[key])) {
            throw new HttpError(400, `${key} must be an integer`);
        }
    }
    if ("school_id" in values && values.school_id <= 0) {
        throw new HttpError(400, "school_id must be a positive integer");
    }
    if ("faculty_id" in values && values.faculty_id <= 0) {
        throw new HttpError(400, "faculty_id must be a positive integer");
    }
    return keys;
}

async function verifyParent(resource, values) {
    if (!resource.parent || values[resource.parent.field] === undefined) return;
    const [rows] = await pool.query(
        `SELECT id FROM ${resource.parent.table} WHERE id = ?`,
        [values[resource.parent.field]]
    );
    if (rows.length === 0) {
        throw new HttpError(400, `${resource.parent.field} does not identify an existing record`);
    }
}

async function findById(resource, id) {
    const [rows] = await pool.query(
        `SELECT * FROM ${resource.table} WHERE id = ?`,
        [id]
    );
    return rows[0];
}

export async function listAdminResource(resourceName) {
    const resource = getResource(resourceName);
    const [rows] = await pool.query(`SELECT * FROM ${resource.table} ORDER BY id`);
    return { data: rows };
}

export async function createAdminResource(resourceName, values) {
    const resource = getResource(resourceName);
    const fields = validateValues(resource, values);
    await verifyParent(resource, values);
    const [result] = await pool.query(
        `INSERT INTO ${resource.table} (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`,
        fields.map((field) => field === "name" ? values[field].trim() : values[field])
    );
    return { data: await findById(resource, result.insertId) };
}

export async function updateAdminResource(resourceName, id, values) {
    const resource = getResource(resourceName);
    const parsedId = validateId(id);
    const fields = validateValues(resource, values, { partial: true });
    await verifyParent(resource, values);
    if (!(await findById(resource, parsedId))) {
        throw new HttpError(404, "Record not found");
    }
    await pool.query(
        `UPDATE ${resource.table} SET ${fields.map((field) => `${field} = ?`).join(", ")} WHERE id = ?`,
        [...fields.map((field) => field === "name" ? values[field].trim() : values[field]), parsedId]
    );
    return { data: await findById(resource, parsedId) };
}

export async function deleteAdminResource(resourceName, id) {
    const resource = getResource(resourceName);
    const parsedId = validateId(id);
    const [result] = await pool.query(
        `DELETE FROM ${resource.table} WHERE id = ?`,
        [parsedId]
    );
    if (result.affectedRows === 0) throw new HttpError(404, "Record not found");
    return { message: "Record deleted" };
}

export async function listAllUsers() {
    const [rows] = await pool.query(
        `SELECT users.id, users.name, users.email, users.role, users.is_verified,
                users.session, users.admission_session,
                users.faculty_id, users.department_id,
                departments.name AS department,
                faculties.name AS faculty,
                schools.name AS school,
                users.created_at
         FROM users
         LEFT JOIN departments ON departments.id = users.department_id
         LEFT JOIN faculties ON faculties.id = users.faculty_id
         LEFT JOIN schools ON schools.id = faculties.school_id
         ORDER BY users.created_at DESC, users.name ASC`
    );
    return { data: rows };
}

export async function listUnverifiedLecturers() {
    const [rows] = await pool.query(
        `SELECT users.id, users.name, users.email, users.faculty_id,
                users.session,
                users.department_id, departments.name AS department,
                faculties.name AS faculty, schools.name AS school, users.created_at
         FROM users
         LEFT JOIN departments ON departments.id = users.department_id
         LEFT JOIN faculties ON faculties.id = users.faculty_id
         LEFT JOIN schools ON schools.id = faculties.school_id
         WHERE users.role = 'lecturer' AND users.is_verified = 0
         ORDER BY users.created_at ASC`
    );
    return { data: rows };
}

export async function verifyLecturer(id, isVerified) {
    if (
        typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
        throw new HttpError(400, "A valid lecturer UUID is required");
    }
    if (typeof isVerified !== "boolean") {
        throw new HttpError(400, "is_verified must be a boolean");
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [lecturers] = await connection.query(
            `SELECT id, faculty_id, department_id, session
             FROM users
             WHERE id = ? AND role = 'lecturer'
             FOR UPDATE`,
            [id]
        );
        const lecturer = lecturers[0];
        if (!lecturer) throw new HttpError(404, "Lecturer not found");
        if (isVerified && (!lecturer.faculty_id || !lecturer.department_id || !lecturer.session)) {
            throw new HttpError(400, "Assign this adviser to a department and class session before verifying the account");
        }
        await connection.query(
            "UPDATE users SET is_verified = ? WHERE id = ?",
            [isVerified, id]
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    return { message: isVerified ? "Lecturer verified" : "Lecturer verification revoked" };
}
