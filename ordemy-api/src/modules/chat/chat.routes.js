import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
    createConversation,
    listClassSessions,
    listConversations,
    listMessages,
    markConversationRead,
    sendMessage,
} from "./chat.controller.js";

const router = Router();

router.use(authenticate);
router.get("/conversations", listConversations);
router.get("/class-sessions", listClassSessions);
router.post("/conversations", createConversation);
router.get("/conversations/:id/messages", listMessages);
router.post("/conversations/:id/read", markConversationRead);
router.post("/conversations/:id/messages", sendMessage);

export default router;
