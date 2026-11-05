import {
    CreateConversation,
    GetUnreadChatCount,
    ListClassSessions,
    ListConversations,
    ListMessages,
    MarkConversationRead,
    SendMessage,
    ToggleMessageReaction,
} from "./chat.services.js";
import { publishChatMessage, publishChatReaction } from "./chat.socket.js";

export async function listConversations(req, res) {
    return res.status(200).json(await ListConversations(req.authUser, req.query));
}

export async function getUnreadCount(req, res) {
    return res.status(200).json(await GetUnreadChatCount(req.authUser));
}

export async function createConversation(req, res) {
    return res.status(201).json(
        await CreateConversation(req.authUser.id, req.body?.type, req.body?.session)
    );
}

export async function listClassSessions(req, res) {
    return res.status(200).json(await ListClassSessions(req.authUser));
}

export async function listMessages(req, res) {
    return res.status(200).json(
        await ListMessages(req.params.id, req.authUser, req.query)
    );
}

export async function markConversationRead(req, res) {
    return res.status(200).json(
        await MarkConversationRead(req.params.id, req.authUser)
    );
}

export async function sendMessage(req, res) {
    const data = await SendMessage(req.params.id, req.authUser, req.body?.body, req.body?.replyToId);
    void publishChatMessage(data).catch((error) => {
        console.error("[chat] Could not publish message notification:", error);
    });
    return res.status(201).json({ data });
}

export async function toggleMessageReaction(req, res) {
    const data = await ToggleMessageReaction(
        req.params.id,
        req.params.messageId,
        req.authUser,
        req.body?.emoji
    );
    publishChatReaction(req.params.id, data);
    return res.status(200).json({ data });
}
