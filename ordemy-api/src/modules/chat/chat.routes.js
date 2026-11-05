import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
    createConversation,
    getUnreadCount,
    listClassSessions,
    listConversations,
    listMessages,
    markConversationRead,
    sendMessage,
    toggleMessageReaction,
} from "./chat.controller.js";

const router = Router();

router.use(authenticate);
router.get("/conversations", listConversations);
router.get("/unread-count", getUnreadCount);
router.get("/class-sessions", listClassSessions);
router.post("/conversations", createConversation);
router.get("/conversations/:id/messages", listMessages);
router.post("/conversations/:id/read", markConversationRead);
router.post("/conversations/:id/messages", sendMessage);
router.put("/conversations/:id/messages/:messageId/reaction", toggleMessageReaction);

export default router;
