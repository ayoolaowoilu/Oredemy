import {
    AuthenticateChatToken,
    AuthorizeConversation,
    SendMessage,
    ValidateConversationId,
} from "./chat.services.js";

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
    io.use(async (socket, next) => {
        try {
            socket.data.user = await AuthenticateChatToken(getToken(socket));
            next();
        } catch (error) {
            next(error);
        }
    });

    io.on("connection", (socket) => {
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
                io.to(roomName(message.conversation_id)).emit("chat:message", message);
                sendResult(socket, acknowledge, message);
            } catch (error) {
                sendError(socket, acknowledge, error);
            }
        });
    });
}
