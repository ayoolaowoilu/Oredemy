import { HttpError } from "../../utils/http-error.js";

export function RegistrationSchema(userData) {
    if (!userData || typeof userData !== "object") {
        throw new HttpError(400, "Registration data is required");
    }
    if (
        typeof userData.name !== "string" ||
        typeof userData.password !== "string" ||
        typeof userData.email !== "string" ||
        !userData.name.trim() ||
        !userData.password ||
        !userData.email
    ) {
        throw new HttpError(400, "Name, email, and password are required");
    }
    if (userData.name.length > 255) {
        throw new HttpError(400, "Name must be at most 255 characters long");
    }
    if (userData.role !== undefined && !["student", "lecturer"].includes(userData.role)) {
        throw new HttpError(400, "Role must be student or lecturer");
    }
    if (userData.password.length < 6) {
        throw new HttpError(400, "Password must be at least 6 characters long");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
        throw new HttpError(400, "Invalid email format");
    }
    if (!/[A-Za-z]/.test(userData.password) || !/\d/.test(userData.password)) {
        throw new HttpError(400, "Password must contain at least one letter and one number");
    }
    if (userData.name.length < 3) {
        throw new HttpError(400, "Name must be at least 3 characters long");
    }
}

export function LoginSchema(userData) {
    if (!userData || typeof userData !== "object") {
        throw new HttpError(400, "Login data is required");
    }
    if (
        typeof userData.email !== "string" ||
        typeof userData.password !== "string" ||
        !userData.email ||
        !userData.password
    ) {
        throw new HttpError(400, "Email and password are required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
        throw new HttpError(400, "Invalid email format");
    }
    if (userData.password.length < 6) {
        throw new HttpError(400, "Password must be at least 6 characters long");
    }
    if (!/[A-Za-z]/.test(userData.password) || !/\d/.test(userData.password)) {
        throw new HttpError(400, "Password must contain at least one letter and one number");
    }
}