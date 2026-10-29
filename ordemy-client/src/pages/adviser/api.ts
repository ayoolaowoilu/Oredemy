import { apiRequest, tokenStorage } from "../../lib/api";
import { connectChatSocket } from "../../utils/chat-socket";
import type {
  ChatConversation,
  ChatMessage,
  ClassRepRequest,
  DepartmentCourse,
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
  auto_sent: boolean;
  has_active_reply_rule: boolean;
  active_reply_text: string | null;
  matched_reply_rule_id: number | null;
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

export interface SchedulerLog {
  event_type: string;
  details: string;
  created_at: string;
}

export interface AiNotification {
  id: number;
  run_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const fetchAiNotifications = () =>
  apiRequest<{ data: AiNotification[]; unread_count: number }>(
    "/api/adviser/ai-notifications",
    { token: getToken(), cache: "no-store" },
  );

export const markAiNotificationRead = (id: number) =>
  apiRequest<{ message: string }>(`/api/adviser/ai-notifications/${id}/read`, {
    method: "PATCH",
    token: getToken(),
    body: {},
  });

export const markAllAiNotificationsRead = () =>
  apiRequest<{ message: string }>("/api/adviser/ai-notifications/read-all", {
    method: "PATCH",
    token: getToken(),
    body: {},
  });

export const fetchAdviserDashboard = () =>
  apiRequest<AdviserDashboard>("/api/adviser/dashboard", {
    token: getToken(),
    cache: "no-store",
  });

export const fetchAiRuns = () =>
  apiRequest<{ data: AiRun[] }>("/api/adviser/ai-runs", {
    token: getToken(),
    cache: "no-store",
  });

export const fetchSchedulerLogs = () =>
  apiRequest<{ data: SchedulerLog[] }>("/api/adviser/scheduler-logs", {
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

export const saveAiReplyRule = (
  runId: number,
  groupId: number,
  replyText: string,
) =>
  apiRequest<{ message: string }>(
    `/api/adviser/ai-runs/${runId}/groups/${groupId}/reply-rule`,
    {
      method: "PUT",
      token: getToken(),
      body: { replyText },
    },
  );

export const cancelAiReplyRule = (runId: number, groupId: number) =>
  apiRequest<{ message: string }>(
    `/api/adviser/ai-runs/${runId}/groups/${groupId}/reply-rule`,
    { method: "DELETE", token: getToken() },
  );

export const fetchPendingClassRepRequests = () =>
  apiRequest<{ data: ClassRepRequest[] }>("/api/class-rep/requests", {
    token: getToken(),
    cache: "no-store",
  });

export const fetchApprovedClassRepresentatives = () =>
  apiRequest<{ data: ClassRepRequest[] }>("/api/class-rep/representatives", {
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

export const revokeClassRepAuthority = (id: number) =>
  apiRequest(`/api/class-rep/requests/${id}/revoke`, {
    method: "PATCH",
    token: getToken(),
    body: {},
  });

export const fetchLecturerCourses = () =>
  apiRequest<{ data: DepartmentCourse[]; academic_session: string }>(
    "/api/courses/mine",
    { token: getToken(), cache: "no-store" },
  );

export const createLecturerCourse = (course: {
  course_name: string;
  course_code: string;
  units: number;
  level: number;
}) =>
  apiRequest<{ data: DepartmentCourse; message: string }>("/api/courses", {
    method: "POST",
    token: getToken(),
    body: course,
  });

export const deleteLecturerCourse = (id: number) =>
  apiRequest<{ message: string }>(`/api/courses/${id}`, {
    method: "DELETE",
    token: getToken(),
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

export const markAdviserConversationRead = (conversationId: string) =>
  apiRequest<{ data: { conversation_id: string; unread_count: number } }>(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: "POST", token: getToken(), body: {} },
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
  return connectChatSocket();
}
