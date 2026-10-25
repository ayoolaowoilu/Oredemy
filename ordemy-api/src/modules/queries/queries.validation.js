import { HttpError } from "../../utils/http-error.js";

export function ValidateQuery(queryParams) {
    if (!queryParams || typeof queryParams !== "object") {
        throw new HttpError(400, "Query data is required");
    }
    if (
        typeof queryParams.subject !== "string" ||
        typeof queryParams.query !== "string" ||
        typeof queryParams.session !== "string" ||
        !queryParams.subject.trim() ||
        !queryParams.query.trim() ||
        !queryParams.session.trim()
    ) {
        throw new HttpError(400, "Session, subject, and query are required");
    }
    if (queryParams.subject.length > 100 || queryParams.session.length > 200) {
        throw new HttpError(400, "Subject must be at most 100 characters and session at most 200 characters");
    }
    if (
        queryParams.query_type !== undefined &&
        !["Results", "Facilities", "Timetable", "Other"].includes(queryParams.query_type)
    ) {
        throw new HttpError(400, "Invalid query type");
    }
    if (
        queryParams.query_for !== undefined &&
        !["Faculty", "Department", "School"].includes(queryParams.query_for)
    ) {
        throw new HttpError(400, "Invalid query audience");
    }
}

export function ValidateDeleteQuery(queryId) {
    if (!Number.isInteger(Number(queryId)) || Number(queryId) <= 0) {
        throw new HttpError(400, "A valid query_id is required");
    }
}