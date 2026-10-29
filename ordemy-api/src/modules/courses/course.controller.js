import {
    CreateLecturerCourse,
    DeleteLecturerCourse,
    ListCurrentStudentCourses,
    ListLecturerCourses,
} from "./course.services.js";

export async function listLecturerCourses(req, res) {
    const data = await ListLecturerCourses(req.authUser.id);
    return res.status(200).json(data);
}

export async function createCourse(req, res) {
    const data = await CreateLecturerCourse(req.authUser.id, req.body);
    return res.status(201).json(data);
}

export async function deleteCourse(req, res) {
    const data = await DeleteLecturerCourse(req.authUser.id, req.params.id);
    return res.status(200).json(data);
}

export async function listCurrentStudentCourses(req, res) {
    const data = await ListCurrentStudentCourses(req.authUser.id, req.authUser.role);
    return res.status(200).json(data);
}
