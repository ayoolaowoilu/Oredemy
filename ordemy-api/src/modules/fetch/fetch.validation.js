import { HttpError } from "../../utils/http-error.js";

const QUERY_TYPES = ["Results", "Facilities", "Timetable", "Other"];

function parsePositiveInteger(value, field, defaultValue, maxValue = Number.MAX_SAFE_INTEGER) {
    if (value === undefined) return defaultValue;
    if (!/^[1-9]\d*$/.test(String(value))) {
        throw new HttpError(400, `${field} must be a positive integer`);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed > maxValue) {
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

    let queryTypes;
    if (query.query_type !== undefined) {
        const requestedTypes = Array.isArray(query.query_type)
            ? query.query_type
            : [query.query_type];
        if (requestedTypes.some((value) => typeof value !== "string")) {
            throw new HttpError(400, "query_type must contain valid complaint types");
        }
        queryTypes = [...new Set(requestedTypes.flatMap((value) => value.split(",")))];
        if (
            queryTypes.length === 0 ||
            queryTypes.some((type) => !QUERY_TYPES.includes(type.trim()))
        ) {
            throw new HttpError(400, "query_type must contain valid complaint types");
        }
        queryTypes = queryTypes.map((type) => type.trim());
    }

    const from = validateDate(query.from, "from");
    const to = validateDate(query.to, "to");
    if (from && to && from > to) {
        throw new HttpError(400, "from must be on or before to");
    }

    return {
        session: session.trim(),
        scope,
        page,
        limit,
        queryTypes,
        from,
        to,
    };
}

function validateDate(value, field) {
    if (value === undefined) return undefined;
    const parsedDate = typeof value === "string"
        ? new Date(`${value}T00:00:00.000Z`)
        : null;
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== value
    ) {
        throw new HttpError(400, `${field} must be a valid date in YYYY-MM-DD format`);
    }
    return value;
}
