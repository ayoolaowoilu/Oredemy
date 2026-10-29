import { apiRequest, tokenStorage } from "../../lib/api";
import type { ApiMessage, PendingLecturer } from "../../utils/types";

function getToken() {
  const token = tokenStorage.get();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  return token;
}

export async function fetchPendingLecturers() {
  return apiRequest<{ data: PendingLecturer[] }>("/api/admin/lecturers/pending", {
    token: getToken(),
    cache: "no-store",
  });
}

export async function setLecturerVerification(id: string, isVerified: boolean) {
  return apiRequest<ApiMessage>(
    `/api/admin/lecturers/${encodeURIComponent(id)}/verification`,
    {
      method: "PATCH",
      token: getToken(),
      body: { is_verified: isVerified },
    },
  );
}
