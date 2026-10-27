import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
    createConversation,
    listConversations,
    listMessages,
    sendMessage,
} from "./chat.controller.js";

const router = Router();

router.use(authenticate);
router.get("/conversations", listConversations);
router.post("/conversations", createConversation);
router.get("/conversations/:id/messages", listMessages);
router.post("/conversations/:id/messages", sendMessage);

export default router;
