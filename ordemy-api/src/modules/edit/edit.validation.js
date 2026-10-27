import { HttpError } from "../../utils/http-error.js";

function verifyChanges(editData, allowedColumns) {
    if (!editData || typeof editData !== "object") {
        throw new HttpError(400, "Edit data is required");
    }
    if (typeof editData.change !== "string" || !editData.change.trim()) {
        throw new HttpError(400, "change must be a comma-separated list of fields");
    }

    const columns = editData.change.split(",").map((column) => column.trim());
    if (
        columns.some((column) => !column || !allowedColumns.includes(column)) ||
        new Set(columns).size !== columns.length
    ) {
        throw new HttpError(400, "Invalid or duplicate field in change");
    }
    if (!editData.values || typeof editData.values !== "object" || Array.isArray(editData.values)) {
        throw new HttpError(400, "values must be an object");
    }
    if (
        columns.some((column) => editData.values[column] === undefined) ||
        Object.keys(editData.values).length !== columns.length
    ) {
        throw new HttpError(400, "change and values must contain the same fields");
    }
    return columns;
}

export function UserEditValidation(editData) {
    const columns = verifyChanges(editData, [
        "name",
        "image",
        "session",
        "faculty_id",
        "department_id",
    ]);
    if (
        "name" in editData.values &&
        (typeof editData.values.name !== "string" ||
            !editData.values.name.trim() ||
            editData.values.name.length > 255)
    ) {
        throw new HttpError(400, "name must be a non-empty string of at most 255 characters");
    }
    if ("image" in editData.values && editData.values.image !== null && typeof editData.values.image !== "string") {
        throw new HttpError(400, "image must be a string or null");
    }
    if (
        "session" in editData.values &&
        editData.values.session !== null &&
        (typeof editData.values.session !== "string" ||
            !editData.values.session.trim() ||
            editData.values.session.length > 50)
    ) {
        throw new HttpError(400, "session must be a non-empty string of at most 50 characters or null");
    }
    for (const field of ["faculty_id", "department_id"]) {
        const value = editData.values[field];
        if (
            field in editData.values &&
            value !== null &&
            (!Number.isSafeInteger(value) || value <= 0)
        ) {
            throw new HttpError(400, `${field} must be a positive integer or null`);
        }
    }
    return columns;
}

export function ValidateQueryEditData(queryEditData) {
    if (!Number.isInteger(Number(queryEditData?.query_id)) || Number(queryEditData.query_id) <= 0) {
        throw new HttpError(400, "A valid query_id is required");
    }
    const columns = verifyChanges(queryEditData, ["subject", "query"]);
    if (
        "subject" in queryEditData.values &&
        (typeof queryEditData.values.subject !== "string" ||
            !queryEditData.values.subject.trim() ||
            queryEditData.values.subject.length > 100)
    ) {
        throw new HttpError(400, "subject must be a non-empty string of at most 100 characters");
    }
    if ("query" in queryEditData.values && (typeof queryEditData.values.query !== "string" || !queryEditData.values.query.trim())) {
        throw new HttpError(400, "query must be a non-empty string");
    }
    return columns;
}
