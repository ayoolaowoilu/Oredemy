
import pool from "../../config/database.js";
import { HashPassword , VerifyPassword } from "../../utils/bcrypt.js";
import { generateToken } from "../../utils/jwt.js";
import { LoginSchema , RegistrationSchema } from "./auth.validation.js";
import { v4 as uuidv4 } from "uuid";


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
        `SELECT users.id, users.name, users.email, users.role,
                users.is_verified, users.session,
                users.faculty_id, users.department_id,
                faculties.name AS faculty, departments.name AS department,
                users.created_at
         FROM users
         LEFT JOIN faculties ON faculties.id = users.faculty_id
         LEFT JOIN departments ON departments.id = users.department_id
         WHERE users.id = ?`,
        [userId]
    );
    if (!rows[0]) return undefined;
    return { ...rows[0], is_verified: Boolean(rows[0].is_verified) };
}