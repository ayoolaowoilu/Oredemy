import { Router } from "express";
import { authenticate, requireVerifiedLecturer } from "../../middleware/auth.js";
import {
    getDashboard,
    listAiRuns,
    listSchedulerLogs,
    reviewAiGroup,
    sendAiGroup,
} from "./adviser.controller.js";

const router = Router();
router.use(authenticate, requireVerifiedLecturer);

router.get("/dashboard", getDashboard);
router.get("/ai-runs", listAiRuns);
router.get("/scheduler-logs", listSchedulerLogs);
router.patch("/ai-runs/:runId/groups/:groupId", reviewAiGroup);
router.post("/ai-runs/:runId/groups/:groupId/send", sendAiGroup);

export default router;
