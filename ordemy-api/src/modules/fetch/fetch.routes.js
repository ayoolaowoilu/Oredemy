import { Router } from "express";
import { authenticate, requireVerifiedLecturer } from "../../middleware/auth.js";
import { fetchLecturerQuestions } from "./fetch.controller.js";

const router = Router();

router.get("/questions", authenticate, requireVerifiedLecturer, fetchLecturerQuestions);

export default router;
