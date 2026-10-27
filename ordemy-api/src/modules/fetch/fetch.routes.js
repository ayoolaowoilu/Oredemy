import { Router } from "express";
import { authenticate, requireVerifiedLecturer } from "../../middleware/auth.js";
import { fetchAcademicStructure, fetchLecturerQuestions } from "./fetch.controller.js";
import { cacheSuccessfulGet } from "../../middleware/response-cache.js";

const router = Router();

router.get("/academic-structure", authenticate, fetchAcademicStructure);
router.get("/questions", authenticate, requireVerifiedLecturer, cacheSuccessfulGet, fetchLecturerQuestions);

export default router;
