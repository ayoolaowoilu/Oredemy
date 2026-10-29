import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, MessageCircle, RefreshCw, Send, UsersRound } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../lib/api";
import { connectChatSocket } from "../../utils/chat-socket";
import type { ChatConversation, ChatMessage } from "../../utils/types";
import { UserAvatar } from "../../components/user-avatar";
import {
  createAdviserConversation,
  createStudentClassConversation,
  fetchChatConversations,
  fetchConversationMessages,
  sendConversationMessage,
} from "./api";
import { Card, Notice, PageIntro, PrimaryButton } from "./shared";

export default function StudentChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const scrollContainer = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof connectChatSocket> | null>(null);
  const conversationId = conversation?.id ?? null;

  const loadMessages = useCallback(async (conversationId: string) => {
    const response = await fetchConversationMessages(conversationId);
    setMessages(response.data);
  }, []);

  const classConversation = conversations.find((item) => item.type === "class");
  const adviserConversation = conversations.find((item) => item.type === "lecturer");

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
    };
    const onConnect = () => {
      setConnected(true);
      join();
    };
    const onDisconnect = () => setConnected(false);
    const onConnectError = (connectionError: Error) => {
      setConnected(false);
      setError(`Live chat connection failed: ${connectionError.message}`);
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("chat:message", onMessage);
    if (socket.connected) onConnect();
    return () => {
      if (socket.connected) socket.emit("chat:leave", { conversationId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("chat:message", onMessage);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const response = await fetchChatConversations();
        const existingClass = response.data.find((item) => item.type === "class");
        const existingAdviser = response.data.find((item) => item.type === "lecturer");
        const [classResult, adviserResult] = await Promise.allSettled([
          existingClass
            ? Promise.resolve(existingClass)
            : createStudentClassConversation().then((result) => result.data),
          existingAdviser
            ? Promise.resolve(existingAdviser)
            : createAdviserConversation().then((result) => result.data),
        ]);
        if (!active) return;
        const available = [
          ...(classResult.status === "fulfilled" ? [classResult.value] : []),
          ...(adviserResult.status === "fulfilled" ? [adviserResult.value] : []),
        ];
        setConversations(available);
        setConversation(available[0] ?? null);
        if (available.length === 0) {
          const failure = classResult.status === "rejected"
            ? classResult.reason
            : adviserResult.status === "rejected"
              ? adviserResult.reason
              : null;
          if (failure) {
            setError(
              failure instanceof ApiError || failure instanceof Error
                ? failure.message
                : "Your chats could not be opened.",
            );
          }
        } else if (classResult.status === "rejected" || adviserResult.status === "rejected") {
          const failure = classResult.status === "rejected" ? classResult.reason : adviserResult.status === "rejected" ? adviserResult.reason : null;
          setError(
            failure instanceof ApiError || failure instanceof Error
              ? failure.message
              : "One of your chats could not be opened.",
          );
        }
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
        if (active) setMessages(response.data);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof ApiError || loadError instanceof Error
              ? loadError.message
              : "Messages could not be loaded.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [conversationId]);

  useEffect(() => {
    const container = scrollContainer.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  async function refresh() {
    if (!conversation) return;
    setError("");
    try {
      await loadMessages(conversation.id);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Could not refresh this conversation.",
      );
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversation || !draft.trim()) return;
    setSending(true);
    setError("");
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.timeout(10_000).emit(
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
    <>
      {error && <Notice onDismiss={() => setError("")}>{error}</Notice>}
      <PageIntro
        eyebrow="Department community"
        title="Chats"
        description="Talk with your adviser or join the group chat for your department and academic session."
        action={
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={!conversation || loading}
            className="inline-flex items-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-5 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F1EDFF] disabled:opacity-50"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      <Card className="overflow-hidden" padded={false}>
        <div className="flex gap-2 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
          {[
            { item: classConversation, label: "Class group", icon: UsersRound },
            { item: adviserConversation, label: "Adviser chat", icon: MessageCircle },
          ].map(({ item, label, icon: Icon }) =>
            item ? (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  if (conversation?.id !== item.id) {
                    setMessages([]);
                    setConversation(item);
                  }
                }}
                aria-pressed={conversation?.id === item.id}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                  conversation?.id === item.id
                    ? "bg-[#2501FF] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-[#2501FF]/10 hover:text-[#2501FF]"
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ) : null,
          )}
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            {conversation?.type === "lecturer" ? (
              <UserAvatar image={conversation.lecturer_image} name={conversation.lecturer_name} className="size-10" />
            ) : (
              <span className="grid size-10 place-items-center rounded-full bg-[#2501FF]/[0.08] text-[#2501FF]">
                {conversation?.type === "class" ? <UsersRound size={19} /> : <MessageCircle size={19} />}
              </span>
            )}
            <div>
              <p className="text-sm font-bold text-slate-900">
                {conversation?.type === "class"
                  ? `Class group · ${conversation.class_session ?? user?.session ?? ""}`
                  : conversation?.lecturer_name ?? "Department adviser"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {conversation?.type === "class"
                  ? `${conversation.class_department ?? user?.department ?? "Your department"} student cohort`
                  : `${user?.department ?? "Your department"} · replies appear here`}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            <span className={`size-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-400"}`} />
            {connected
              ? conversation?.type === "class"
                ? "Live group channel"
                : "Live adviser channel"
              : "Socket disconnected"}
          </span>
        </div>

        <div
          ref={scrollContainer}
          className="flex h-[min(58vh,560px)] min-h-[300px] flex-col gap-3 overflow-y-auto bg-[#fafaff] px-4 py-5 sm:px-6"
        >
          {loading ? (
            <div className="m-auto w-full max-w-sm space-y-3">
              <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
              <div className="ml-auto h-16 w-3/4 animate-pulse rounded-2xl bg-violet-100" />
            </div>
          ) : messages.length ? (
            messages.map((message) => {
              const isMine = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex max-w-[94%] items-end gap-2 sm:max-w-[82%] ${isMine ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <UserAvatar
                    image={isMine ? user?.image : message.sender_image}
                    name={isMine ? user?.name : message.sender_name}
                    className="size-8 shrink-0"
                  />
                  <article className={`min-w-0 rounded-2xl px-4 py-3 ${isMine ? "rounded-br-md bg-[#2501FF] text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                    {!isMine && conversation?.type === "class" && (
                      <p className="mb-1 text-[10px] font-bold text-[#2501FF]">
                        {message.sender_name}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
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
            <div className="m-auto max-w-sm px-4 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-[#2501FF] shadow-sm">
                <MessageCircle size={22} />
              </span>
              <h2 className="mt-4 text-base font-bold text-slate-900">
                Start a conversation
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {conversation?.type === "class"
                  ? "Start a conversation with students and your adviser in this class group."
                  : "Send your adviser a message. Questions you submit on the Questions page will also appear in this chat."}
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
          className="flex items-end gap-3 border-t border-slate-100 bg-white p-4 sm:p-5"
        >
          <label className="sr-only" htmlFor="adviser-chat-message">
            {conversation?.type === "class"
              ? "Write a message to your class group"
              : "Write a message to your adviser"}
          </label>
          <textarea
            id="adviser-chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={5000}
            rows={2}
            placeholder={
              user?.department_id && user?.session
                ? "Write a message…"
                : "Complete your academic profile to contact an adviser"
            }
            disabled={!conversation || !user?.department_id || !user?.session}
            className="max-h-36 min-h-12 flex-1 resize-y rounded-xl border border-[#E9E5FF] px-3.5 py-3 text-sm leading-5 outline-none placeholder:text-slate-400 focus:border-[#2501FF] focus:ring-2 focus:ring-[#2501FF]/10 disabled:bg-slate-50"
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
          >
            <span className="hidden sm:inline">
              {sending ? "Sending…" : "Send"}
            </span>
            <Send size={16} />
          </PrimaryButton>
        </form>
      </Card>
    </>
  );
}
