import { Router } from "express";
import { authenticate, requireVerifiedLecturer } from "../../middleware/auth.js";
import {
    getDashboard,
    listAiNotifications,
    listAiRuns,
    listSchedulerLogs,
    markAiNotificationRead,
    markAllAiNotificationsRead,
    reviewAiGroup,
    runAiNow,
    sendAiGroup,
    saveAiReplyRule,
    cancelAiReplyRule,
} from "./adviser.controller.js";

const router = Router();
router.use(authenticate, requireVerifiedLecturer);

router.get("/dashboard", getDashboard);
router.get("/ai-runs", listAiRuns);
router.get("/scheduler-logs", listSchedulerLogs);
router.get("/ai-notifications", listAiNotifications);
router.patch("/ai-notifications/read-all", markAllAiNotificationsRead);
router.patch("/ai-notifications/:notificationId/read", markAiNotificationRead);
router.post("/ai-runs/trigger", runAiNow);
router.patch("/ai-runs/:runId/groups/:groupId", reviewAiGroup);
router.post("/ai-runs/:runId/groups/:groupId/send", sendAiGroup);
router.put("/ai-runs/:runId/groups/:groupId/reply-rule", saveAiReplyRule);
router.delete("/ai-runs/:runId/groups/:groupId/reply-rule", cancelAiReplyRule);

export default router;
