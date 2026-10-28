import {
    CreateConversation,
    ListClassSessions,
    ListConversations,
    ListMessages,
    SendMessage,
} from "./chat.services.js";
import { publishChatMessage } from "./chat.socket.js";

export async function listConversations(req, res) {
    return res.status(200).json(await ListConversations(req.authUser));
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

export async function sendMessage(req, res) {
    const data = await SendMessage(req.params.id, req.authUser, req.body?.body);
    publishChatMessage(data);
    return res.status(201).json({ data });
}
