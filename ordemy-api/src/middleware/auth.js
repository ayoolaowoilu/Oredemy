import pool from "../config/database.js";
import { verifyToken } from "../utils/jwt.js";

export async function authenticate(req, res, next) {
    const authorization = req.headers.authorization;
    const bearerToken = authorization?.startsWith("Bearer ")
        ? authorization.slice(7)
        : undefined;
    const token = req.headers["x-token"] ?? bearerToken;

    if (typeof token !== "string" || !token) {
        return res.status(401).json({ message: "Authentication token required" });
    }

    let payload;
    try {
        payload = verifyToken(token);
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }

    const [rows] = await pool.query(
        "SELECT id, role FROM users WHERE id = ?",
        [payload.id]
    );
    if (rows.length === 0) {
        return res.status(401).json({ message: "Authenticated user not found" });
    }

    req.authUser = { id: rows[0].id, role: rows[0].role };
    return next();
}

export function requireAdmin(req, res, next) {
    if (req.authUser?.role !== "admin") {
        return res.status(403).json({ message: "Administrator access required" });
    }
    return next();
}
