
import pool from "../../config/database.js";
import { HashPassword , VerifyPassword } from "../../utils/bcrypt.js";
import { generateToken } from "../../utils/jwt.js";
import { LoginSchema , RegistrationSchema } from "./auth.validation.js";
import { v4 as uuidv4 } from "uuid";
import { HttpError } from "../../utils/http-error.js";
import { createHash } from "node:crypto";


export async function RegisterUser(userData) {
     RegistrationSchema(userData);
    const password = await HashPassword(userData.password);
    const id = uuidv4();
    const role = userData.role ?? "student";

    await pool.query(
        "INSERT INTO users (id, name, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)",
        [id, userData.name, userData.email, password, role, role !== "lecturer"]
    );

    return {
        token: generateToken({ id, email: userData.email }),
        user: {
            id,
            name: userData.name,
            email: userData.email,
            role,
            is_verified: role !== "lecturer",
        },
        message: "Registration Successful",
    };
}

export async function LoginUser(userData) {
    LoginSchema(userData);
    const [rows] = await pool.query(
        "SELECT id, name, email, password, role, is_verified FROM users WHERE email = ?",
        [userData.email]
    );
    if (rows.length === 0) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const isPasswordValid = await VerifyPassword(userData.password, rows[0].password);
    if (!isPasswordValid) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    return {
        token: generateToken({ id: rows[0].id, email: rows[0].email }),
        user: {
            id: rows[0].id,
            name: rows[0].name,
            email: rows[0].email,
            role: rows[0].role,
            is_verified: Boolean(rows[0].is_verified),
        },
        message: "Login Successful",
    };
}

export async function GetUserData(userId) {
    const [rows] = await pool.query(
        `SELECT users.id, users.name, users.email, users.role, users.image,
                users.is_verified, users.session, users.admission_session,
                users.faculty_id, users.department_id,
                faculties.name AS faculty, departments.name AS department,
                schools.calendar_offset,
                users.created_at
         FROM users
         LEFT JOIN faculties ON faculties.id = users.faculty_id
         LEFT JOIN schools ON schools.id = faculties.school_id
         LEFT JOIN departments ON departments.id = users.department_id
         WHERE users.id = ?`,
        [userId]
    );
    if (!rows[0]) return undefined;
    return {
        ...rows[0],
        is_verified: Boolean(rows[0].is_verified),
        calendar_offset: rows[0].calendar_offset === null
            ? null
            : Number(rows[0].calendar_offset),
    };
}

export async function SaveProfileImage(userId, imageBuffer, contentType) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
        throw new HttpError(400, "Select an image to upload");
    }
    if (imageBuffer.length > 1024 * 1024) {
        throw new HttpError(413, "Profile images must be 1 MB or smaller");
    }
    if (!allowedTypes.has(contentType)) {
        throw new HttpError(400, "Profile image must be JPEG, PNG, or WebP");
    }
    const isJpeg = contentType === "image/jpeg" &&
        imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 && imageBuffer[2] === 0xff;
    const isPng = contentType === "image/png" &&
        imageBuffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isWebp = contentType === "image/webp" &&
        imageBuffer.toString("ascii", 0, 4) === "RIFF" &&
        imageBuffer.toString("ascii", 8, 12) === "WEBP";
    if (!isJpeg && !isPng && !isWebp) {
        throw new HttpError(400, "The selected file is not a valid JPEG, PNG, or WebP image");
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        throw new HttpError(503, "Profile image uploads are not configured on the server");
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cloudName)) {
        throw new HttpError(500, "Cloudinary configuration is invalid");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "ordemy/profiles";
    const signature = createHash("sha1")
        .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
        .digest("hex");
    const formData = new FormData();
    formData.append("file", new Blob([imageBuffer], { type: contentType }), "profile-image");
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("folder", folder);
    formData.append("signature", signature);

    let response;
    try {
        response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: "POST",
                body: formData,
                signal: AbortSignal.timeout(30_000),
            }
        );
    } catch {
        throw new HttpError(502, "Cloudinary image service is temporarily unavailable");
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.secure_url !== "string") {
        throw new HttpError(502, "Cloudinary could not upload the profile image");
    }

    await pool.query("UPDATE users SET image = ? WHERE id = ?", [result.secure_url, userId]);
    return { image: result.secure_url };
}

export async function AssignAdviserDepartment(userId, departmentId, session) {
    if (!Number.isSafeInteger(departmentId) || departmentId <= 0) {
        throw new HttpError(400, "department_id must be a positive integer");
    }
    if (
        typeof session !== "string" ||
        !/^\d{4}\/\d{4}$/.test(session) ||
        Number(session.slice(5)) !== Number(session.slice(0, 4)) + 1
    ) {
        throw new HttpError(400, "Choose a valid class session in YYYY/YYYY format");
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [userRows] = await connection.query(
            "SELECT role, is_verified FROM users WHERE id = ? FOR UPDATE",
            [userId]
        );
        const user = userRows[0];
        if (!user || user.role !== "lecturer") {
            throw new HttpError(403, "Adviser onboarding is available to lecturer accounts only");
        }
        if (user.is_verified) {
            throw new HttpError(403, "Verified adviser assignments can only be changed by an administrator");
        }

        const [departmentRows] = await connection.query(
            `SELECT departments.id, departments.faculty_id
             FROM departments
             INNER JOIN faculties ON faculties.id = departments.faculty_id
             WHERE departments.id = ?`,
            [departmentId]
        );
        if (!departmentRows[0]) {
            throw new HttpError(400, "Choose a valid department");
        }

        await connection.query(
            `UPDATE users
             SET department_id = ?, faculty_id = ?, session = ?
             WHERE id = ?`,
            [departmentRows[0].id, departmentRows[0].faculty_id, session, userId]
        );
        await connection.commit();
        return { message: "Department and class session saved. Your account is now awaiting administrator verification." };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}