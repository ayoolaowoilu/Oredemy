import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { HttpError } from "./http-error.js";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
    const encodedKey = process.env.AI_SETTINGS_ENCRYPTION_KEY;
    if (!encodedKey) {
        throw new HttpError(
            503,
            "AI key storage is unavailable until AI_SETTINGS_ENCRYPTION_KEY is configured"
        );
    }

    const key = Buffer.from(encodedKey, "base64");
    if (key.length !== 32) {
        throw new HttpError(500, "AI_SETTINGS_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
    }
    return key;
}

export function encryptSecret(secret) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(value) {
    const [encodedIv, encodedTag, encodedData] = value.split(".");
    if (!encodedIv || !encodedTag || !encodedData) {
        throw new HttpError(500, "Stored AI key is invalid");
    }
    const decipher = createDecipheriv(
        ALGORITHM,
        getEncryptionKey(),
        Buffer.from(encodedIv, "base64")
    );
    decipher.setAuthTag(Buffer.from(encodedTag, "base64"));
    return Buffer.concat([
        decipher.update(Buffer.from(encodedData, "base64")),
        decipher.final(),
    ]).toString("utf8");
}
