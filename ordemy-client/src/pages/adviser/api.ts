import { io } from "socket.io-client";
import { apiRequest, tokenStorage } from "../../lib/api";
import type {
  ChatConversation,
  ChatMessage,
  ClassRepRequest,
} from "../../utils/types";

function getToken() {
  const token = tokenStorage.get();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  return token;
}

export interface AdviserDashboard {
  stats: {
    totalQuestions: number;
    todayQuestions: number;
    awaitingReply: number;
    pendingClassRepRequests: number;
    dailyVolumeCritical: boolean;
  };
}

export interface AiGroup {
  id: number;
  run_id: number;
  title: string;
  question_ids: number[];
  draft_reply: string;
  status: "pending" | "sent";
  created_at: string;
  sent_at: string | null;
}

export interface AiRun {
  id: number;
  slot_key: string;
  status: "running" | "completed" | "failed";
  question_count: number;
  severity: "normal" | "critical";
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  groups: AiGroup[];
}

export const fetchAdviserDashboard = () =>
  apiRequest<AdviserDashboard>("/api/adviser/dashboard", {
    token: getToken(),
    cache: "no-store",
  });

export const fetchAiSettings = () =>
  apiRequest<{
    provider: string;
    baseUrl: string;
    model: string;
    keyConfigured: boolean;
    updatedAt: string | null;
  }>("/api/adviser/ai-settings", {
    token: getToken(),
    cache: "no-store",
  });

export const saveAiSettings = (apiKey: string, model: string) =>
  apiRequest("/api/adviser/ai-settings", {
    method: "PUT",
    token: getToken(),
    body: { apiKey, model },
  });

export const fetchAiRuns = () =>
  apiRequest<{ data: AiRun[] }>("/api/adviser/ai-runs", {
    token: getToken(),
    cache: "no-store",
  });

export const updateAiDraft = (
  runId: number,
  groupId: number,
  draftReply: string,
) =>
  apiRequest(`/api/adviser/ai-runs/${runId}/groups/${groupId}`, {
    method: "PATCH",
    token: getToken(),
    body: { draftReply },
  });

export const sendAiDraft = (runId: number, groupId: number) =>
  apiRequest<{ message: string; recipients: number }>(
    `/api/adviser/ai-runs/${runId}/groups/${groupId}/send`,
    { method: "POST", token: getToken(), body: {} },
  );

export const fetchPendingClassRepRequests = () =>
  apiRequest<{ data: ClassRepRequest[] }>("/api/class-rep/requests", {
    token: getToken(),
    cache: "no-store",
  });

export const reviewClassRepRequest = (
  id: number,
  status: "approved" | "rejected",
  note?: string,
) =>
  apiRequest(`/api/class-rep/requests/${id}`, {
    method: "PATCH",
    token: getToken(),
    body: { status, note },
  });

export const fetchAdviserConversations = () =>
  apiRequest<{ data: ChatConversation[] }>("/api/chat/conversations", {
    token: getToken(),
    cache: "no-store",
  });

export const fetchClassSessions = () =>
  apiRequest<{ data: string[] }>("/api/chat/class-sessions", {
    token: getToken(),
    cache: "no-store",
  });

export const createAdviserClassChat = (session: string) =>
  apiRequest<{ data: ChatConversation }>("/api/chat/conversations", {
    method: "POST",
    token: getToken(),
    body: { type: "class", session },
  });

export const fetchAdviserMessages = (conversationId: string) =>
  apiRequest<{ data: ChatMessage[] }>(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    { token: getToken(), cache: "no-store" },
  );

export const sendAdviserMessage = (
  conversationId: string,
  body: string,
) =>
  apiRequest<{ data: ChatMessage }>(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      token: getToken(),
      body: { body },
    },
  );

export function connectAdviserSocket() {
  const token = getToken();
  const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:8081")
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
  return io(apiUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 6,
  });
}
