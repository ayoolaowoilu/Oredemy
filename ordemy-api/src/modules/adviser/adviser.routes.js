import { Router } from "express";
import { authenticate, requireVerifiedLecturer } from "../../middleware/auth.js";
import {
    getDashboard,
    getAiPreferences,
    listAiNotifications,
    listAiRuns,
    listSchedulerLogs,
    markAiNotificationRead,
    markAllAiNotificationsRead,
    reviewAiGroup,
    runAiNow,
    sendAiGroup,
    updateAiPreferences,
} from "./adviser.controller.js";

const router = Router();
router.use(authenticate, requireVerifiedLecturer);

router.get("/dashboard", getDashboard);
router.get("/ai-runs", listAiRuns);
router.get("/scheduler-logs", listSchedulerLogs);
router.get("/ai-preferences", getAiPreferences);
router.patch("/ai-preferences", updateAiPreferences);
router.get("/ai-notifications", listAiNotifications);
router.patch("/ai-notifications/read-all", markAllAiNotificationsRead);
router.patch("/ai-notifications/:notificationId/read", markAiNotificationRead);
router.post("/ai-runs/trigger", runAiNow);
router.patch("/ai-runs/:runId/groups/:groupId", reviewAiGroup);
router.post("/ai-runs/:runId/groups/:groupId/send", sendAiGroup);

export default router;
