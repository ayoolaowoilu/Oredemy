import { useEffect, useState } from "react";
import { apiRequest, tokenStorage } from "../lib/api";
import { connectChatSocket } from "../utils/chat-socket";
import type { ChatConversation } from "../utils/types";

const CHAT_READ_EVENT = "ordemy:chat-read";

export function useChatUnreadCount(userId?: string) {
  const [unreadState, setUnreadState] = useState({ userId, count: 0 });

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const refresh = () => {
      const token = tokenStorage.get();
      if (!token) return;
      void apiRequest<{ data: ChatConversation[] }>("/api/chat/conversations", {
        token,
        cache: "no-store",
      }).then(({ data }) => {
        if (active) {
          setUnreadState({
            userId,
            count: data.reduce(
              (total, conversation) => total + Number(conversation.unread_count ?? 0),
              0,
            ),
          });
        }
      }).catch((error: unknown) => {
        console.error("[chat] Could not refresh unread count:", error);
      });
    };

    refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener(CHAT_READ_EVENT, refresh);

    let socket: ReturnType<typeof connectChatSocket> | null = null;
    try {
      socket = connectChatSocket();
      socket.on("chat:notification", refresh);
      socket.on("connect_error", (error) => {
        console.error("[chat] Unread notification connection failed:", error.message);
      });
    } catch (error) {
      console.error("[chat] Could not connect unread notifications:", error);
    }

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener(CHAT_READ_EVENT, refresh);
      socket?.disconnect();
    };
  }, [userId]);

  return unreadState.userId === userId ? unreadState.count : 0;
}

export function notifyChatRead() {
  window.dispatchEvent(new Event(CHAT_READ_EVENT));
}
