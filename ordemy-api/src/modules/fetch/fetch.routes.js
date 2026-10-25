import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { fetchLecturerQuestions } from "./fetch.controller.js";

const router = Router();

router.get("/questions", authenticate, fetchLecturerQuestions);

export default router;
