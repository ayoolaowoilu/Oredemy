import { Router } from "express";
import { authenticate, requireVerifiedLecturer } from "../../middleware/auth.js";
import {
    createCourse,
    deleteCourse,
    listCurrentStudentCourses,
    listLecturerCourses,
} from "./course.controller.js";

const router = Router();

router.get("/current", authenticate, listCurrentStudentCourses);
router.get("/mine", authenticate, requireVerifiedLecturer, listLecturerCourses);
router.post("/", authenticate, requireVerifiedLecturer, createCourse);
router.delete("/:id", authenticate, requireVerifiedLecturer, deleteCourse);

export default router;
