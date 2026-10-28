import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  MessageCircle,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  UsersRound,
} from "lucide-react";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../context/useAuth";
import type { ChatConversation, ChatMessage } from "../../utils/types";
import { UserAvatar } from "../../components/user-avatar";
import {
  connectAdviserSocket,
  createAdviserClassChat,
  fetchAdviserConversations,
  fetchAdviserMessages,
  fetchClassSessions,
  sendAdviserMessage,
} from "./api";
import { AdviserCard, AdviserNotice, AdviserPageIntro } from "./shared";

function showTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function AdviserChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const socketRef = useRef<ReturnType<typeof connectAdviserSocket> | null>(null);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const selectedConversationId = selected?.id ?? null;

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const [conversationResponse, sessionResponse] = await Promise.all([
          fetchAdviserConversations(),
          fetchClassSessions(),
        ]);
        if (!active) return;
        setConversations(conversationResponse.data);
        setSelected(conversationResponse.data[0] ?? null);
        setSessions(sessionResponse.data);
        setSession(sessionResponse.data[0] ?? "");
      } catch (loadError: unknown) {
        if (active) {
          setError(
            loadError instanceof ApiError || loadError instanceof Error
              ? loadError.message
              : "Could not load adviser chats.",
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
    const socket = connectAdviserSocket();
    socketRef.current = socket;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = (connectionError: Error) => {
      setConnected(false);
      setError(`Live chat connection failed: ${connectionError.message}`);
    };
    const onMessage = (message: ChatMessage) => {
      setMessages((current) => {
        if (
          message.conversation_id !== selectedIdRef.current ||
          current.some((existing) => existing.id === message.id)
        ) {
          return current;
        }
        return [...current, message];
      });
      setConversations((current) =>
        current.map((item) =>
          item.id === message.conversation_id
            ? { ...item, last_message: message.body, last_message_at: message.created_at }
            : item,
        ),
      );
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("chat:message", onMessage);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("chat:message", onMessage);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!selectedConversationId || !socket) return;
    const conversationId = selectedConversationId;
    const join = () => socket.emit("chat:join", { conversationId });
    if (socket.connected) join();
    else socket.once("connect", join);
    return () => {
      socket.off("connect", join);
      if (socket.connected) socket.emit("chat:leave", { conversationId });
    };
  }, [selectedConversationId, connected]);

  useEffect(() => {
    let active = true;
    if (!selectedConversationId) return () => {
      active = false;
    };
    fetchAdviserMessages(selectedConversationId)
      .then((response) => {
        if (active) setMessages(response.data);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof ApiError || loadError instanceof Error
              ? loadError.message
              : "Could not load messages.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [selectedConversationId]);

  useEffect(() => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollTop = scrollContainer.current.scrollHeight;
    }
  }, [messages.length]);

  async function createGroup() {
    if (!session) return;
    setCreating(true);
    setError("");
    try {
      const response = await createAdviserClassChat(session);
      setConversations((current) => [
        response.data,
        ...current.filter((item) => item.id !== response.data.id),
      ]);
      setMessages([]);
      setSelected(response.data);
      setNotice(`Class group chat opened for ${session}.`);
    } catch (createError: unknown) {
      setError(
        createError instanceof ApiError || createError instanceof Error
          ? createError.message
          : "Could not open the class group chat.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const socket = socketRef.current;
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    setError("");
    if (socket?.connected) {
      socket.timeout(10_000).emit(
        "chat:message",
        { conversationId: selected.id, body: draft.trim() },
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
            current.some((item) => item.id === message.id)
              ? current
              : [...current, message],
          );
          setDraft("");
        },
      );
      return;
    }

    try {
      const response = await sendAdviserMessage(selected.id, draft.trim());
      setMessages((current) =>
        current.some((item) => item.id === response.data.id)
          ? current
          : [...current, response.data],
      );
      setConversations((current) =>
        current.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                last_message: response.data.body,
                last_message_at: response.data.created_at,
              }
            : item,
        ),
      );
      setDraft("");
    } catch (sendError: unknown) {
      setError(
        sendError instanceof ApiError || sendError instanceof Error
          ? sendError.message
          : "Your message could not be sent.",
      );
    } finally {
      setSending(false);
    }
  }

  async function refreshMessages() {
    if (!selected) return;
    setError("");
    try {
      const response = await fetchAdviserMessages(selected.id);
      setMessages(response.data);
    } catch (refreshError: unknown) {
      setError(
        refreshError instanceof ApiError || refreshError instanceof Error
          ? refreshError.message
          : "Could not refresh this conversation.",
      );
    }
  }

  return (
    <>
      <AdviserPageIntro
        eyebrow="Real-time support"
        title="Adviser chats"
        description="Message students one-to-one or open a department class group. Messages update live with Socket.IO."
      />
      {error && <AdviserNotice dismiss={() => setError("")}>{error}</AdviserNotice>}
      {notice && <AdviserNotice tone="success" dismiss={() => setNotice("")}>{notice}</AdviserNotice>}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Department group chat</p>
          <p className="mt-1 text-xs text-slate-500">Choose a student session to create or open its group.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={session}
            onChange={(event) => setSession(event.target.value)}
            disabled={!sessions.length}
            className="min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2501FF]/50"
          >
            {sessions.length ? sessions.map((item) => (
              <option key={item} value={item}>{item}</option>
            )) : <option value="">No student sessions</option>}
          </select>
          <button
            type="button"
            onClick={() => void createGroup()}
            disabled={!session || creating}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2501FF] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d00d6] disabled:opacity-50"
          >
            <Plus size={15} /> {creating ? "Opening…" : "Open group"}
          </button>
        </div>
      </div>

      <AdviserCard className="overflow-hidden p-0">
        <div className="grid min-h-[min(70vh,680px)] lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <p className="text-sm font-bold text-slate-900">Conversations</p>
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${connected ? "text-emerald-700" : "text-amber-700"}`}>
                <span className={`size-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
                {connected ? "Live" : "Socket offline"}
              </span>
            </div>
            <div className="flex max-h-64 gap-2 overflow-x-auto p-3 lg:max-h-[590px] lg:flex-col lg:overflow-y-auto">
              {loading ? (
                <p className="p-3 text-xs text-slate-400">Loading conversations…</p>
              ) : conversations.length ? conversations.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setMessages([]);
                    setSelected(item);
                  }}
                  className={`min-w-56 rounded-xl p-3 text-left transition-colors lg:min-w-0 ${selected?.id === item.id ? "bg-[#2501FF]/[0.07]" : "hover:bg-slate-50"}`}
                >
                  <span className="flex items-center gap-2">
                    {item.type === "class" ? (
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-700">
                        <UsersRound size={16} />
                      </span>
                    ) : (
                      <UserAvatar image={item.student_image} name={item.student_name} className="size-9 shrink-0 text-sm" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {item.type === "class"
                          ? `${item.class_department ?? "Department"} · ${item.class_session ?? "Class"}`
                          : item.student_name ?? "Student conversation"}
                      </span>
                      <span className="block text-[10px] capitalize text-slate-400">
                        {item.type === "class" ? "Group chat" : "Direct chat"}
                      </span>
                    </span>
                  </span>
                  <span className="mt-2 block truncate text-xs text-slate-500">
                    {item.last_message ?? "No messages yet"}
                  </span>
                </button>
              )) : (
                <div className="px-3 py-5 text-center lg:py-10">
                  <MessageSquareText className="mx-auto text-slate-300" size={22} />
                  <p className="mt-2 text-xs text-slate-500">No conversations yet.</p>
                </div>
              )}
            </div>
          </aside>

          <div className="flex min-h-[440px] min-w-0 flex-col">
            {selected ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
                  {selected.type === "class" ? (
                    <span className="grid size-10 place-items-center rounded-full bg-violet-50 text-violet-700">
                      <UsersRound size={18} />
                    </span>
                  ) : (
                    <UserAvatar image={selected.student_image} name={selected.student_name} className="size-10" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {selected.type === "class"
                        ? `${selected.class_department ?? "Department"} · ${selected.class_session ?? "Class"}`
                        : selected.student_name ?? "Student"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {selected.type === "class" ? "Department group conversation" : "One-to-one adviser conversation"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshMessages()}
                    aria-label="Refresh messages"
                    className="ml-auto grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#2501FF]"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <div
                  ref={scrollContainer}
                  className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#fafaff] px-4 py-5 sm:px-6"
                >
                  {messages.length ? messages.map((message) => {
                    const isMine = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex max-w-[94%] items-end gap-2 sm:max-w-[82%] ${isMine ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                      >
                        <UserAvatar image={isMine ? user?.image : message.sender_image} name={isMine ? user?.name : message.sender_name} className="size-8 shrink-0" />
                        <article className={`min-w-0 rounded-2xl px-4 py-3 ${isMine ? "rounded-br-md bg-[#2501FF] text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                          {!isMine && <p className="mb-1 text-[10px] font-bold text-[#2501FF]">{message.sender_name}</p>}
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                          <p className={`mt-2 text-right text-[10px] ${isMine ? "text-white/65" : "text-slate-400"}`}>
                            {showTime(message.created_at)}
                          </p>
                        </article>
                      </div>
                    );
                  }) : (
                    <div className="m-auto text-center">
                      <MessageCircle size={24} className="mx-auto text-slate-300" />
                      <p className="mt-3 text-sm text-slate-500">Start the conversation with a helpful message.</p>
                    </div>
                  )}
                </div>
                <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-100 p-3 sm:p-4">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={5000}
                    placeholder={connected ? "Write a message…" : "Write a message (realtime unavailable)…"}
                    disabled={sending}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#2501FF]/50 focus:ring-4 focus:ring-[#2501FF]/[0.08] disabled:bg-slate-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    aria-label="Send message"
                    className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#2501FF] text-white hover:bg-[#1d00d6] disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div className="m-auto p-8 text-center">
                <MessageCircle size={26} className="mx-auto text-slate-300" />
                <h2 className="mt-3 font-bold text-slate-900">Select a conversation</h2>
                <p className="mt-1 text-sm text-slate-500">Student chats and class groups will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </AdviserCard>
    </>
  );
}
