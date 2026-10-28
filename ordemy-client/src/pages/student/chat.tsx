import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, MessageCircle, RefreshCw, Send } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../lib/api";
import type { ChatConversation, ChatMessage } from "../../utils/types";
import {
  createAdviserConversation,
  fetchChatConversations,
  fetchConversationMessages,
  sendConversationMessage,
} from "./api";
import { Card, Notice, PageIntro, PrimaryButton } from "./shared";

export default function StudentChat() {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollContainer = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (conversationId: string) => {
    const response = await fetchConversationMessages(conversationId);
    setMessages(response.data);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const response = await fetchChatConversations();
        let adviserConversation = response.data.find(
          (item) => item.type === "lecturer",
        );
        if (!adviserConversation) {
          adviserConversation = (await createAdviserConversation()).data;
        }
        if (!active) return;
        setConversation(adviserConversation);
        const messagesResponse = await fetchConversationMessages(
          adviserConversation.id,
        );
        if (active) setMessages(messagesResponse.data);
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
    try {
      await sendConversationMessage(conversation.id, draft.trim());
      setDraft("");
      await loadMessages(conversation.id);
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
        eyebrow="Direct support"
        title="Chat with your adviser"
        description="Your questions are routed to a verified lecturer for your department. Messages and question replies stay together here."
        action={
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={!conversation || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-[#2501FF]/30 hover:text-[#2501FF] disabled:opacity-50"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#2501FF]/[0.08] text-[#2501FF]">
              <MessageCircle size={19} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Department adviser
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {user?.department ?? "Your department"} · replies appear here
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Adviser channel
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
                <article
                  key={message.id}
                  className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                    isMine
                      ? "ml-auto rounded-br-md bg-[#2501FF] text-white"
                      : "mr-auto rounded-bl-md border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {!isMine && (
                    <p className="mb-1 text-[10px] font-bold text-[#2501FF]">
                      {message.sender_name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {message.body}
                  </p>
                  <p
                    className={`mt-2 text-right text-[10px] ${
                      isMine ? "text-white/65" : "text-slate-400"
                    }`}
                  >
                    {new Intl.DateTimeFormat(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(message.created_at))}
                  </p>
                </article>
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
                Send your adviser a message. Questions you submit on the
                Questions page will also appear in this chat.
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
            Write a message to your adviser
          </label>
          <textarea
            id="adviser-chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={5000}
            rows={2}
            placeholder={
              user?.department_id
                ? "Write a message…"
                : "Complete your academic profile to contact an adviser"
            }
            disabled={!conversation || !user?.department_id}
            className="max-h-36 min-h-12 flex-1 resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-5 outline-none placeholder:text-slate-400 focus:border-[#2501FF] focus:ring-2 focus:ring-[#2501FF]/10 disabled:bg-slate-50"
          />
          <PrimaryButton
            type="submit"
            disabled={
              sending ||
              !conversation ||
              !draft.trim() ||
              !user?.department_id
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
