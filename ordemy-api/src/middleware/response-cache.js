import { HttpError } from "../utils/http-error.js";

import "dotenv/config";

const cache = new Map();
const enabledValue = process.env.CACHE_ENABLED ?? "true";
const ttlSeconds = Number(process.env.CACHE_TTL_SECONDS ?? 30);
const maxEntries = Number(process.env.CACHE_MAX_ENTRIES ?? 500);

if (!["true", "false"].includes(enabledValue.toLowerCase())) {
    throw new HttpError(500, "CACHE_ENABLED must be true or false");
}
if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1) {
    throw new HttpError(500, "CACHE_TTL_SECONDS must be a positive integer");
}
if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
    throw new HttpError(500, "CACHE_MAX_ENTRIES must be a positive integer");
}

const isEnabled = enabledValue.toLowerCase() === "true";
const ttlMilliseconds = ttlSeconds * 1000;
const maxResponseBytes = 1024 * 1024;

function makeCacheKey(req) {
    const userId = req.authUser?.id;
    if (!userId) return null;
    return `${userId}:${req.method}:${req.originalUrl}`;
}

export function cacheSuccessfulGet(req, res, next) {
    if (!isEnabled || req.method !== "GET") return next();

    const key = makeCacheKey(req);
    if (!key) return next();

    const entry = cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
        cache.delete(key);
        cache.set(key, entry);
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Cache-Control", "private, no-store");
        return res.status(entry.statusCode).json(entry.body);
    }
    if (entry) cache.delete(key);

    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "private, no-store");
    const sendJson = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const responseBytes = Buffer.byteLength(JSON.stringify(body));
            if (responseBytes <= maxResponseBytes) {
                cache.set(key, {
                    body,
                    statusCode: res.statusCode,
                    expiresAt: Date.now() + ttlMilliseconds,
                });
                while (cache.size > maxEntries) {
                    cache.delete(cache.keys().next().value);
                }
            }
        }
        return sendJson(body);
    };
    return next();
}

export function invalidateCacheOnMutation(req, res, next) {
    if (req.method === "GET" || req.method === "HEAD") return next();

    const sendJson = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            cache.clear();
        }
        return sendJson(body);
    };
    return next();
}

export function clearResponseCache() {
    cache.clear();
}
