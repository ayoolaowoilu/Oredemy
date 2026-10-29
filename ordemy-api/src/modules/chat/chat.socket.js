import {
    AuthenticateChatToken,
    AuthorizeConversation,
    SendMessage,
    ValidateConversationId,
} from "./chat.services.js";
import pool from "../../config/database.js";

let socketServer;

export function publishChatMessage(message) {
    if (!socketServer || !message?.conversation_id) return Promise.resolve();
    socketServer.to(roomName(message.conversation_id)).emit("chat:message", message);

    return (async () => {
        const [conversationRows] = await pool.query(
            `SELECT type, student_id, lecturer_id, class_department_id, class_session
             FROM chat_conversations
             WHERE id = ?`,
            [message.conversation_id]
        );
        const conversation = conversationRows[0];
        if (!conversation) return;

        let recipientIds;
        if (conversation.type === "class") {
            const [users] = await pool.query(
                `SELECT id
                 FROM users
                 WHERE department_id = ? AND session = ?
                   AND (
                       role = 'student'
                       OR (role = 'lecturer' AND is_verified = TRUE)
                   )`,
                [conversation.class_department_id, conversation.class_session]
            );
            recipientIds = users.map(({ id }) => id);
        } else if (conversation.type === "support") {
            const [users] = await pool.query(
                "SELECT id FROM users WHERE role = 'admin' OR id = ?",
                [conversation.student_id]
            );
            recipientIds = users.map(({ id }) => id);
        } else {
            recipientIds = [conversation.student_id, conversation.lecturer_id].filter(Boolean);
        }

        const recipientRooms = recipientIds
            .filter((userId) => userId !== message.sender_id)
            .map(userRoom);
        if (recipientRooms.length) {
            socketServer.to(recipientRooms).emit("chat:notification", message);
        }
    })();
}

function getToken(socket) {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === "string") return authToken;

    const tokenHeader = socket.handshake.headers["x-token"];
    if (typeof tokenHeader === "string") return tokenHeader;

    const authorization = socket.handshake.headers.authorization;
    return typeof authorization === "string" && authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : undefined;
}

function roomName(conversationId) {
    return `chat:${conversationId}`;
}

function userRoom(userId) {
    return `user:${userId}`;
}

function sendResult(socket, acknowledge, result) {
    if (typeof acknowledge === "function") {
        acknowledge({ ok: true, data: result });
    } else {
        socket.emit("chat:result", { ok: true, data: result });
    }
}

function sendError(socket, acknowledge, error) {
    if (!error.statusCode || error.statusCode >= 500) console.error(error);
    const message = error.statusCode && error.statusCode < 500
        ? error.message
        : "Internal server error";
    const response = { ok: false, error: { message } };
    if (typeof acknowledge === "function") {
        acknowledge(response);
    } else {
        socket.emit("chat:error", response.error);
    }
}

export function configureChatSocket(io) {
    socketServer = io;
    io.use(async (socket, next) => {
        try {
            socket.data.user = await AuthenticateChatToken(getToken(socket));
            next();
        } catch (error) {
            next(error);
        }
    });

    io.on("connection", (socket) => {
        void socket.join(userRoom(socket.data.user.id));

        socket.on("chat:join", async (payload, acknowledge) => {
            try {
                const conversationId = payload?.conversationId;
                ValidateConversationId(conversationId);
                await AuthorizeConversation(conversationId, socket.data.user);
                await socket.join(roomName(conversationId));
                sendResult(socket, acknowledge, { conversationId });
            } catch (error) {
                sendError(socket, acknowledge, error);
            }
        });

        socket.on("chat:leave", (payload, acknowledge) => {
            try {
                const conversationId = payload?.conversationId;
                ValidateConversationId(conversationId);
                socket.leave(roomName(conversationId));
                sendResult(socket, acknowledge, { conversationId });
            } catch (error) {
                sendError(socket, acknowledge, error);
            }
        });

        socket.on("chat:message", async (payload, acknowledge) => {
            try {
                const message = await SendMessage(
                    payload?.conversationId,
                    socket.data.user,
                    payload?.body
                );
                void publishChatMessage(message).catch((error) => {
                    console.error("[chat] Could not publish message notification:", error);
                });
                sendResult(socket, acknowledge, message);
            } catch (error) {
                sendError(socket, acknowledge, error);
            }
        });
    });
}
