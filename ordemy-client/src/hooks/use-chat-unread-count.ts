import { useEffect, useState } from "react";
import { apiRequest, tokenStorage } from "../lib/api";
import { connectChatSocket, disconnectChatSocket } from "../utils/chat-socket";
import type { ChatMessage } from "../utils/types";

const CHAT_READ_EVENT = "ordemy:chat-read";

export function useChatUnreadCount(userId?: string) {
  const [unreadState, setUnreadState] = useState({ userId, count: 0 });

  useEffect(() => {
    if (!userId) return;

    let active = true;
    let unreadRevision = 0;
    const refresh = () => {
      const token = tokenStorage.get();
      if (!token) return;
      const requestRevision = unreadRevision;
      void apiRequest<{ data: { unread_count: number } }>("/api/chat/unread-count", {
        token,
        cache: "no-store",
      }).then(({ data }) => {
        if (active && requestRevision === unreadRevision) {
          setUnreadState({
            userId,
            count: Number(data.unread_count),
          });
        }
      }).catch((error: unknown) => {
        console.error("[chat] Could not refresh unread count:", error);
      });
    };

    const onMessageNotification = (message: ChatMessage) => {
      if (message.sender_id === userId) return;
      unreadRevision += 1;
      setUnreadState((current) => ({
        userId,
        count: current.userId === userId ? current.count + 1 : 1,
      }));
    };
    const onRead = () => {
      unreadRevision += 1;
      refresh();
    };
    const onWindowFocus = () => refresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    window.addEventListener(CHAT_READ_EVENT, onRead);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    let socket: ReturnType<typeof connectChatSocket> | null = null;
    const onConnectError = (error: Error) => {
      console.error("[chat] Unread notification connection failed:", error.message);
    };
    try {
      socket = connectChatSocket();
      socket.on("connect", refresh);
      socket.on("chat:notification", onMessageNotification);
      socket.on("connect_error", onConnectError);
    } catch (error) {
      console.error("[chat] Could not connect unread notifications:", error);
    }

    return () => {
      active = false;
      window.removeEventListener(CHAT_READ_EVENT, onRead);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      socket?.off("connect", refresh);
      socket?.off("chat:notification", onMessageNotification);
      socket?.off("connect_error", onConnectError);
      if (socket) disconnectChatSocket(socket);
    };
  }, [userId]);

  return unreadState.userId === userId ? unreadState.count : 0;
}

export function notifyChatRead() {
  window.dispatchEvent(new Event(CHAT_READ_EVENT));
}
