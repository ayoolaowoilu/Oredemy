import { apiRequest, tokenStorage } from "../../lib/api";
import type {
  AddQueryResponse,
  ChatConversation,
  ChatMessage,
  ClassRepRequestListResponse,
  ClassRepRequestResponse,
  StudentDashboardResponse,
} from "../../utils/types";

function getToken() {
  const token = tokenStorage.get();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  return token;
}

export interface StudentQuestion {
  id: number;
  subject: string;
  query: string;
  query_type: "Results" | "Facilities" | "Timetable" | "Other";
  query_for: "Faculty" | "Department" | "School";
  session: string;
  created_at: string;
  has_reply: boolean;
}

export const fetchStudentDashboard = () =>
  apiRequest<StudentDashboardResponse>("/api/query/dashboard", {
    token: getToken(),
    cache: "no-store",
  });

export const fetchStudentQuestions = () =>
  apiRequest<{ data: StudentQuestion[] }>("/api/query/mine", {
    token: getToken(),
    cache: "no-store",
  });

export const fetchMyClassRepRequests = () =>
  apiRequest<ClassRepRequestListResponse>("/api/class-rep/requests/mine", {
    token: getToken(),
    cache: "no-store",
  });

export const sendStudentQuery = (payload: {
  subject: string;
  query: string;
  session: string;
  query_type: "Results" | "Facilities" | "Timetable" | "Other";
  query_for: "Department" | "Faculty" | "School";
}) =>
  apiRequest<AddQueryResponse>("/api/query/add", {
    method: "POST",
    token: getToken(),
    body: { queryData: payload },
  });

export const sendClassRepRequest = (message: string) =>
  apiRequest<ClassRepRequestResponse>("/api/class-rep/requests", {
    method: "POST",
    token: getToken(),
    body: { message },
  });

export const fetchChatConversations = () =>
  apiRequest<{ data: ChatConversation[] }>("/api/chat/conversations", {
    token: getToken(),
    cache: "no-store",
  });

export const createAdviserConversation = () =>
  apiRequest<{ data: ChatConversation }>("/api/chat/conversations", {
    method: "POST",
    token: getToken(),
    body: { type: "lecturer" },
  });

export const createStudentClassConversation = () =>
  apiRequest<{ data: ChatConversation }>("/api/chat/conversations", {
    method: "POST",
    token: getToken(),
    body: { type: "class" },
  });

export const fetchConversationMessages = (conversationId: string) =>
  apiRequest<{ data: ChatMessage[] }>(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    { token: getToken(), cache: "no-store" },
  );

export const sendConversationMessage = (
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
