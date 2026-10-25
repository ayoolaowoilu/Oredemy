import { HttpError } from "../../utils/http-error.js";

export function ValidateClassRepRequest(body) {
    if (body?.message !== undefined && (
        typeof body.message !== "string" || body.message.length > 1000
    )) {
        throw new HttpError(400, "message must be a string of at most 1000 characters");
    }
    return body?.message?.trim() || null;
}

export function ValidateClassRepDecision(body) {
    if (!["approved", "rejected"].includes(body?.status)) {
        throw new HttpError(400, "status must be approved or rejected");
    }
    if (body.note !== undefined && (
        typeof body.note !== "string" || body.note.length > 1000
    )) {
        throw new HttpError(400, "note must be a string of at most 1000 characters");
    }
    return { status: body.status, note: body.note?.trim() || null };
}
