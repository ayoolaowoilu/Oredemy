import { createHash } from "node:crypto";
import webPush from "web-push";
import pool from "../../config/database.js";
import { HttpError } from "../../utils/http-error.js";

function endpointHash(endpoint) {
    return createHash("sha256").update(endpoint).digest("hex");
}

export async function GetPushConfiguration() {
    const publicKey = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
        ? process.env.VAPID_PUBLIC_KEY
        : null;
    return { data: { publicKey } };
}

export async function SavePushSubscription(userId, body) {
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;
    let parsedEndpoint;
    try {
        parsedEndpoint = new URL(endpoint);
    } catch {
        throw new HttpError(400, "A valid push endpoint is required");
    }
    if (
        typeof endpoint !== "string" ||
        endpoint.length > 2048 ||
        parsedEndpoint.protocol !== "https:" ||
        parsedEndpoint.username ||
        parsedEndpoint.password ||
        parsedEndpoint.port ||
        !(
            parsedEndpoint.hostname === "fcm.googleapis.com" ||
            parsedEndpoint.hostname.endsWith(".push.services.mozilla.com") ||
            parsedEndpoint.hostname === "web.push.apple.com" ||
            parsedEndpoint.hostname.endsWith(".notify.windows.com")
        ) ||
        typeof p256dh !== "string" ||
        !p256dh ||
        p256dh.length > 255 ||
        typeof auth !== "string" ||
        !auth ||
        auth.length > 255
    ) {
        throw new HttpError(400, "A valid push subscription is required");
    }
    await pool.query(
        `INSERT INTO user_push_subscriptions
         (endpoint_hash, user_id, endpoint, p256dh, auth)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), endpoint = VALUES(endpoint),
            p256dh = VALUES(p256dh), auth = VALUES(auth), updated_at = CURRENT_TIMESTAMP`,
        [endpointHash(endpoint), userId, endpoint, p256dh, auth]
    );
    return { message: "Browser notifications enabled" };
}

export async function RemovePushSubscription(userId, endpoint) {
    if (typeof endpoint !== "string" || !endpoint) {
        throw new HttpError(400, "A push endpoint is required");
    }
    await pool.query(
        "DELETE FROM user_push_subscriptions WHERE endpoint_hash = ? AND user_id = ?",
        [endpointHash(endpoint), userId]
    );
    return { message: "Browser notifications disabled" };
}

export async function SendPushNotification(userId, payload) {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
    webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:support@ordemy.app",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    const [rows] = await pool.query(
        `SELECT endpoint_hash, endpoint, p256dh, auth
         FROM user_push_subscriptions
         WHERE user_id = ?`,
        [userId]
    );
    if (!rows.length) return;
    const [userRows] = await pool.query("SELECT role FROM users WHERE id = ?", [userId]);
    const url = userRows[0]?.role === "lecturer"
        ? "/dashboard/adviser/chat"
        : userRows[0]?.role === "admin"
            ? "/dashboard/admin"
            : "/dashboard/student/chat";
    await Promise.all(rows.map(async (row) => {
        try {
            await webPush.sendNotification(
                {
                    endpoint: row.endpoint,
                    keys: { p256dh: row.p256dh, auth: row.auth },
                },
                JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? url }),
                { TTL: 60 * 60 }
            );
        } catch (error) {
            if (error.statusCode === 404 || error.statusCode === 410) {
                await pool.query(
                    "DELETE FROM user_push_subscriptions WHERE endpoint_hash = ?",
                    [row.endpoint_hash]
                );
                return;
            }
            console.error(
                `[notifications] Push delivery failed for user ${userId}: HTTP ${error.statusCode ?? "unknown"}`
            );
        }
    }));
}
