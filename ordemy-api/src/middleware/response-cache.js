import "dotenv/config";
import { createClient } from "redis";
import { HttpError } from "../utils/http-error.js";

const memoryCache = new Map();
const enabledValue = process.env.CACHE_ENABLED ?? "true";
const store = (process.env.CACHE_STORE ?? "memory").toLowerCase();
const ttlSeconds = Number(process.env.CACHE_TTL_SECONDS ?? 30);
const maxEntries = Number(process.env.CACHE_MAX_ENTRIES ?? 500);
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const redisPrefix = process.env.REDIS_KEY_PREFIX ?? "ordemy:response:";

if (!["true", "false"].includes(enabledValue.toLowerCase())) {
    throw new HttpError(500, "CACHE_ENABLED must be true or false");
}
if (!["memory", "redis"].includes(store)) {
    throw new HttpError(500, "CACHE_STORE must be memory or redis");
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
let redisClient;
let redisConnectPromise;

async function getRedisClient() {
    if (!redisClient) {
        redisClient = createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 2) return new Error("Redis cache connection unavailable");
                    return Math.min(retries * 100, 1000);
                },
            },
        });
        redisClient.on("error", (error) => {
            console.error("Redis cache client error:", error);
        });
    }
    if (!redisClient.isOpen) {
        if (!redisConnectPromise) {
            redisConnectPromise = redisClient.connect().finally(() => {
                redisConnectPromise = undefined;
            });
        }
        await redisConnectPromise;
    }
    return redisClient;
}

function getMemoryEntry(key) {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        memoryCache.delete(key);
        return null;
    }
    memoryCache.delete(key);
    memoryCache.set(key, entry);
    return entry;
}

async function getCachedEntry(key) {
    if (store === "memory") return getMemoryEntry(key);

    const client = await getRedisClient();
    const serializedEntry = await client.get(`${redisPrefix}${key}`);
    if (!serializedEntry) return null;
    try {
        return JSON.parse(serializedEntry);
    } catch (error) {
        console.error("Invalid JSON in Redis response cache; deleting the entry:", error);
        await client.del(`${redisPrefix}${key}`);
        return null;
    }
}

async function setCachedEntry(key, entry) {
    if (store === "memory") {
        memoryCache.set(key, {
            ...entry,
            expiresAt: Date.now() + ttlMilliseconds,
        });
        while (memoryCache.size > maxEntries) {
            memoryCache.delete(memoryCache.keys().next().value);
        }
        return;
    }

    const client = await getRedisClient();
    await client.set(`${redisPrefix}${key}`, JSON.stringify(entry), { EX: ttlSeconds });
}

async function clearCachedEntries() {
    if (store === "memory") {
        memoryCache.clear();
        return;
    }

    const client = await getRedisClient();
    for await (const keys of client.scanIterator({
        MATCH: `${redisPrefix}*`,
        COUNT: 100,
    })) {
        if (keys.length > 0) await client.del(keys);
    }
}

function makeCacheKey(req) {
    const userId = req.authUser?.id;
    if (!userId) return null;
    return `${userId}:${req.method}:${req.originalUrl}`;
}

export async function cacheSuccessfulGet(req, res, next) {
    if (!isEnabled || req.method !== "GET") return next();

    const key = makeCacheKey(req);
    if (!key) return next();

    let entry;
    try {
        entry = await getCachedEntry(key);
    } catch (error) {
        console.error(`Unable to read ${store} response cache; bypassing cache:`, error);
        return next();
    }

    if (entry) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Cache-Control", "private, no-store");
        return res.status(entry.statusCode).json(entry.body);
    }

    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "private, no-store");
    const sendJson = res.json.bind(res);
    res.json = async (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                const serializedBody = JSON.stringify(body);
                if (Buffer.byteLength(serializedBody) <= maxResponseBytes) {
                    await setCachedEntry(key, {
                        body: JSON.parse(serializedBody),
                        statusCode: res.statusCode,
                    });
                }
            } catch (error) {
                console.error(`Unable to write ${store} response cache; returning uncached response:`, error);
            }
        }
        return sendJson(body);
    };
    return next();
}

export function invalidateCacheOnMutation(req, res, next) {
    if (req.method === "GET" || req.method === "HEAD") return next();

    const sendJson = res.json.bind(res);
    res.json = async (body) => {
        if (isEnabled && res.statusCode >= 200 && res.statusCode < 300) {
            try {
                await clearCachedEntries();
            } catch (error) {
                console.error(`Unable to clear ${store} response cache after mutation:`, error);
            }
        }
        return sendJson(body);
    };
    return next();
}

export async function clearResponseCache() {
    await clearCachedEntries();
}
