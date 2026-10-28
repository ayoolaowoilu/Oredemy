import { Router } from "express";
import { authenticate, requireVerifiedLecturer } from "../../middleware/auth.js";
import {
    getDashboard,
    getAiSettings,
    saveAiSettings,
    listAiRuns,
    reviewAiGroup,
    sendAiGroup,
} from "./adviser.controller.js";

const router = Router();
router.use(authenticate, requireVerifiedLecturer);

router.get("/dashboard", getDashboard);
router.get("/ai-settings", getAiSettings);
router.put("/ai-settings", saveAiSettings);
router.get("/ai-runs", listAiRuns);
router.patch("/ai-runs/:runId/groups/:groupId", reviewAiGroup);
router.post("/ai-runs/:runId/groups/:groupId/send", sendAiGroup);

export default router;
