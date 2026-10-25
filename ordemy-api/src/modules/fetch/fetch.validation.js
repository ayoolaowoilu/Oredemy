import { HttpError } from "../../utils/http-error.js";

const QUERY_TYPES = ["Results", "Facilities", "Timetable", "Other"];

function parsePositiveInteger(value, field, defaultValue) {
    if (value === undefined) return defaultValue;
    if (!/^[1-9]\d*$/.test(String(value))) {
        throw new HttpError(400, `${field} must be a positive integer`);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
        throw new HttpError(400, `${field} is outside the supported range`);
    }
    return parsed;
}

export function ValidateQuestionFetch(query) {
    const session = query.session;
    if (typeof session !== "string" || !session.trim() || session.length > 200) {
        throw new HttpError(400, "A session of at most 200 characters is required");
    }

    const scope = query.scope ?? "department";
    if (!["department", "faculty"].includes(scope)) {
        throw new HttpError(400, "scope must be department or faculty");
    }

    const page = parsePositiveInteger(query.page, "page", 1);
    const limit = parsePositiveInteger(query.limit, "limit", 20);
    if (limit > 100) {
        throw new HttpError(400, "limit must not exceed 100");
    }

    if (query.query_type !== undefined && !QUERY_TYPES.includes(query.query_type)) {
        throw new HttpError(400, "Invalid query_type");
    }

    return { session: session.trim(), scope, page, limit, queryType: query.query_type };
}
