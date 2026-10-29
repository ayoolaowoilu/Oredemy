import { HttpError } from "../../utils/http-error.js";

const COURSE_LEVELS = new Set([100, 200, 300, 400, 500, 600]);

export function ValidateCourse(body) {
    if (typeof body?.course_name !== "string" || !body.course_name.trim() || body.course_name.trim().length > 255) {
        throw new HttpError(400, "course_name must contain 1 to 255 characters");
    }
    if (
        typeof body?.course_code !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,19}$/.test(body.course_code.trim())
    ) {
        throw new HttpError(400, "course_code must be 1 to 20 letters, numbers, spaces, dots, slashes, dashes, or underscores");
    }
    if (!COURSE_LEVELS.has(body?.level)) {
        throw new HttpError(400, "level must be one of 100, 200, 300, 400, 500, or 600");
    }
    if (!Number.isSafeInteger(body?.units) || body.units < 1 || body.units > 30) {
        throw new HttpError(400, "units must be a whole number between 1 and 30");
    }
    return {
        course_name: body.course_name.trim(),
        course_code: body.course_code.trim().replace(/\s+/g, " ").toUpperCase(),
        level: body.level,
        units: body.units,
    };
}

export function ValidateCourseId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new HttpError(400, "A valid course ID is required");
    }
    return id;
}
