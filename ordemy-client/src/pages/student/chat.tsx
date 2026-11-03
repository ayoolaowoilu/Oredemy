import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, LoaderCircle, MessageCircle, RefreshCw, Send } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { notifyChatRead } from "../../hooks/use-chat-unread-count";
import { ApiError } from "../../lib/api";
import { connectChatSocket } from "../../utils/chat-socket";
import type { ChatConversation, ChatMessage } from "../../utils/types";
import { UserAvatar } from "../../components/user-avatar";
import {
  createAdviserConversation,
  fetchChatConversations,
  fetchConversationMessages,
  markConversationRead,
  sendConversationMessage,
} from "./api";
import { Card, Notice, PrimaryButton } from "./shared";

export default function StudentChat() {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [messagesError, setMessagesError] = useState("");
  const [analysisNotice, setAnalysisNotice] = useState("");
  const scrollContainer = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof connectChatSocket> | null>(null);
  const loadingOlderRef = useRef(false);
  const pendingScrollRestore = useRef<{ height: number; top: number } | null>(null);
  const stickToBottom = useRef(true);
  const conversationId = conversation?.id ?? null;

  const markRead = useCallback(async (id: string) => {
    await markConversationRead(id);
    notifyChatRead();
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const response = await fetchConversationMessages(conversationId);
    setMessages((current) => {
      const byId = new Map(current.map((message) => [message.id, message]));
      for (const message of response.data) byId.set(message.id, message);
      return [...byId.values()].sort((left, right) => left.id - right.id);
    });
    setHasOlderMessages(response.data.length === 50);
    await markRead(conversationId);
  }, [markRead]);

  useEffect(() => {
    if (!conversationId) return;
    const socket = connectChatSocket();
    socketRef.current = socket;
    const join = () => socket.emit("chat:join", { conversationId });
    const onMessage = (message: ChatMessage) => {
      if (message.conversation_id !== conversationId) return;
      setMessages((current) =>
        current.some((existing) => existing.id === message.id)
          ? current
          : [...current, message],
      );
      if (message.sender_id !== user?.id && document.visibilityState === "visible") {
        void markRead(conversationId).catch((readError: unknown) => {
          setError(readError instanceof Error ? readError.message : "Could not mark messages as read.");
        });
      }
    };
    const onConnect = () => join();
    socket.on("chat:message", onMessage);
    socket.on("connect", onConnect);
    if (socket.connected) onConnect();
    return () => {
      if (socket.connected) socket.emit("chat:leave", { conversationId });
      socket.off("connect", onConnect);
      socket.off("chat:message", onMessage);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, markRead, user?.id]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const response = await fetchChatConversations();
        let adviserConversation = response.data.find((item) => item.type === "lecturer");
        if (!adviserConversation) {
          adviserConversation = (await createAdviserConversation()).data;
        }
        if (!active) return;
        setConversation(adviserConversation);
      } catch (loadError: unknown) {
        if (active) {
          setError(
            loadError instanceof ApiError || loadError instanceof Error
              ? loadError.message
              : "Your adviser chat could not be opened.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    fetchConversationMessages(conversationId)
      .then((response) => {
        if (active) {
          setMessages(response.data);
          setHasOlderMessages(response.data.length === 50);
          setMessagesLoading(false);
          void markRead(conversationId).catch((readError: unknown) => {
            if (active) {
              setError(readError instanceof Error ? readError.message : "Could not mark messages as read.");
            }
          });
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setMessagesLoading(false);
          setMessagesError(
            loadError instanceof ApiError || loadError instanceof Error
              ? loadError.message
              : "Messages could not be loaded.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [conversationId, markRead]);

  useLayoutEffect(() => {
    const container = scrollContainer.current;
    if (!container) return;
    if (pendingScrollRestore.current) {
      const { height, top } = pendingScrollRestore.current;
      container.scrollTop = top + container.scrollHeight - height;
      pendingScrollRestore.current = null;
    } else if (stickToBottom.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  async function loadOlderMessages() {
    const container = scrollContainer.current;
    const oldestMessageId = messages[0]?.id;
    if (
      !conversation ||
      !container ||
      !oldestMessageId ||
      !hasOlderMessages ||
      loadingOlderRef.current
    ) {
      return;
    }

    loadingOlderRef.current = true;
    setLoadingOlderMessages(true);
    pendingScrollRestore.current = {
      height: container.scrollHeight,
      top: container.scrollTop,
    };
    try {
      const response = await fetchConversationMessages(conversation.id, {
        before: oldestMessageId,
      });
      setMessages((current) => {
        const byId = new Map(current.map((message) => [message.id, message]));
        for (const message of response.data) byId.set(message.id, message);
        return [...byId.values()].sort((left, right) => left.id - right.id);
      });
      setHasOlderMessages(response.data.length === 50);
      if (response.data.length === 0) pendingScrollRestore.current = null;
    } catch (loadError: unknown) {
      pendingScrollRestore.current = null;
      setError(
        loadError instanceof ApiError || loadError instanceof Error
          ? loadError.message
          : "Older messages could not be loaded.",
      );
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlderMessages(false);
    }
  }

  async function refresh() {
    if (!conversation) return;
    setMessagesError("");
    setMessagesLoading(true);
    try {
      stickToBottom.current = true;
      await loadMessages(conversation.id);
    } catch (refreshError) {
      setMessagesError(
        refreshError instanceof Error
          ? refreshError.message
          : "Could not refresh this conversation.",
      );
    } finally {
      setMessagesLoading(false);
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversation || !draft.trim()) return;
    setSending(true);
    setError("");
    setAnalysisNotice("");
    const showQuestionAnalysis = (message: ChatMessage) => {
      if (message.question_analysis_status === "saved_with_default_type") {
        setAnalysisNotice("Message saved as an Other question and shared in this chat.");
      } else if (message.question_analysis_status === "saved" && message.question_type) {
        setAnalysisNotice(`Saved as a ${message.question_type} question and shared in this chat.`);
      }
    };
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.timeout(30_000).emit(
        "chat:message",
        { conversationId: conversation.id, body: draft.trim() },
        (
          timeoutError: Error | null,
          result?: { ok: boolean; data?: ChatMessage; error?: { message: string } },
        ) => {
          setSending(false);
          const message = result?.data;
          if (timeoutError || !result?.ok || !message) {
            setError(
              timeoutError
                ? "No confirmation was received. Refresh the conversation before retrying."
                : result?.error?.message ?? "Your message could not be sent.",
            );
            return;
          }
          setMessages((current) =>
            current.some((existing) => existing.id === message.id)
              ? current
              : [...current, message],
          );
          showQuestionAnalysis(message);
          setDraft("");
        },
      );
      return;
    }
    try {
      const response = await sendConversationMessage(conversation.id, draft.trim());
      setMessages((current) =>
        current.some((existing) => existing.id === response.data.id)
          ? current
          : [...current, response.data],
      );
      showQuestionAnalysis(response.data);
      await markRead(conversation.id);
      setDraft("");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Your message could not be sent.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {error && <Notice onDismiss={() => setError("")}>{error}</Notice>}
      {analysisNotice && (
        <Notice tone="success" onDismiss={() => setAnalysisNotice("")}>
          {analysisNotice}
        </Notice>
      )}
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        {loading ? (
          <div className="grid flex-1 place-items-center p-6" role="status" aria-live="polite">
            <div className="flex flex-col items-center text-center">
              <LoaderCircle className="animate-spin text-[#2501FF]" size={28} />
              <p className="mt-3 text-sm font-semibold text-slate-700">Opening your adviser chat…</p>
            </div>
          </div>
        ) : conversation ? (
              <>
                <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-3 py-2.5 sm:px-5 sm:py-3">
                  <UserAvatar image={conversation.lecturer_image} name={conversation.lecturer_name} className="size-9 sm:size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{conversation.lecturer_name ?? "Department adviser"}</p>
                    <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                      {user?.department ?? "Your department"} · questions are saved automatically
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    disabled={messagesLoading}
                    aria-label="Refresh messages"
                    className="grid size-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <RefreshCw size={17} />
                  </button>
                </div>

        <div
          ref={scrollContainer}
          onScroll={(event) => {
            const element = event.currentTarget;
            stickToBottom.current =
              element.scrollHeight - element.scrollTop - element.clientHeight < 80;
            if (
              element.scrollTop < 32 &&
              hasOlderMessages &&
              !loadingOlderMessages
            ) {
              void loadOlderMessages();
            }
          }}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-[#fafaff] px-3 py-3 sm:px-5 sm:py-4"
        >
          {loadingOlderMessages && (
            <div className="flex shrink-0 items-center justify-center gap-2 py-1 text-xs text-slate-500" role="status">
              <LoaderCircle className="animate-spin text-[#2501FF]" size={15} />
              Loading earlier messages…
            </div>
          )}
          {messagesLoading ? (
            <div className="m-auto flex items-center gap-2 text-sm text-slate-500" role="status" aria-live="polite">
              <LoaderCircle className="animate-spin text-[#2501FF]" size={20} />
              Loading messages…
            </div>
          ) : messagesError ? (
            <div className="m-auto max-w-sm px-4 py-8 text-center" role="alert">
              <p className="text-sm text-slate-600">{messagesError}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="mt-3 min-h-11 rounded-full bg-[#2501FF] px-5 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : messages.length ? (
            messages.map((message) => {
              const isMine = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex max-w-[92%] items-end gap-1.5 sm:max-w-[82%] sm:gap-2 ${isMine ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <UserAvatar
                    image={isMine ? user?.image : message.sender_image}
                    name={isMine ? user?.name : message.sender_name}
                    className="size-7 shrink-0 sm:size-8"
                  />
                  <article className={`min-w-0 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 ${isMine ? "rounded-br-md bg-[#2501FF] text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-5 sm:text-sm sm:leading-6">
                      {message.body}
                    </p>
                    <p className={`mt-2 text-right text-[10px] ${isMine ? "text-white/65" : "text-slate-400"}`}>
                      {new Intl.DateTimeFormat(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                        month: "short",
                        day: "numeric",
                      }).format(new Date(message.created_at))}
                    </p>
                  </article>
                </div>
              );
            })
          ) : (
            <div className="m-auto max-w-sm px-4 py-8 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-white text-[#2501FF] shadow-sm">
                <MessageCircle size={22} />
              </span>
              <h2 className="mt-3 text-base font-bold text-slate-900">
                Start a conversation
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Send your adviser a message. Every message is added to their question inbox and categorized automatically.
              </p>
              <Link
                to="/dashboard/student/questions"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#2501FF] hover:underline"
              >
                Ask a structured question <ArrowDown size={13} />
              </Link>
            </div>
          )}
        </div>

        <form
          onSubmit={send}
          className="flex shrink-0 items-end gap-2 border-t border-slate-100 bg-white p-2.5 sm:gap-3 sm:p-4"
        >
          <label className="sr-only" htmlFor="adviser-chat-message">
            Write a message to your adviser
          </label>
          <textarea
            id="adviser-chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={5000}
            rows={1}
            placeholder={
              user?.department_id && user?.session
                ? "Write a message…"
                : "Complete your academic profile to contact an adviser"
            }
            disabled={!conversation || !user?.department_id || !user?.session}
            className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-[#E9E5FF] px-3 py-2.5 text-sm leading-5 outline-none placeholder:text-slate-400 focus:border-[#2501FF] focus:ring-2 focus:ring-[#2501FF]/10 disabled:bg-slate-50 sm:max-h-36 sm:px-3.5 sm:py-3"
          />
          <PrimaryButton
            type="submit"
            disabled={
              sending ||
              !conversation ||
              !draft.trim() ||
              !user?.department_id ||
              !user?.session
            }
            aria-label={sending ? "Sending message" : "Send message"}
            className="size-11 shrink-0 rounded-xl px-0 sm:w-auto sm:px-4"
          >
            <span className="hidden sm:inline">
              {sending ? "Sending…" : "Send"}
            </span>
            <Send size={16} />
          </PrimaryButton>
        </form>
        </>
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div>
              <MessageCircle size={24} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Your adviser chat is unavailable</p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setLoading(true);
                  fetchChatConversations()
                    .then(async (response) => {
                      const existing = response.data.find((item) => item.type === "lecturer");
                      setConversation(existing ?? (await createAdviserConversation()).data);
                    })
                    .catch((openError: unknown) => {
                      setError(
                        openError instanceof ApiError || openError instanceof Error
                          ? openError.message
                          : "Your adviser chat could not be opened.",
                      );
                    })
                    .finally(() => setLoading(false));
                }}
                className="mt-3 min-h-11 rounded-full bg-[#2501FF] px-5 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
