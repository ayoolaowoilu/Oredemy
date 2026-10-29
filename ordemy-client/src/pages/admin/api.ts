import { apiRequest, tokenStorage } from "../../lib/api";
import type {
  AdminRecordResponse,
  ApiMessage,
  Department,
  Faculty,
  PendingLecturer,
  School,
} from "../../utils/types";

function getToken() {
  const token = tokenStorage.get();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  return token;
}

export type AdminResourceName = "schools" | "faculties" | "departments";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "lecturer" | "admin";
  is_verified: number | boolean;
  session: string | null;
  admission_session: string | null;
  faculty_id: number | null;
  department_id: number | null;
  faculty: string | null;
  department: string | null;
  school: string | null;
  created_at: string;
}

export type AdminResourceRecord = School | Faculty | Department;

export const fetchAdminUsers = async () =>
  apiRequest<{ data: AdminUser[] }>("/api/admin/users", {
    token: getToken(),
    cache: "no-store",
  });

export const fetchAdminResource = async <T extends AdminResourceRecord>(
  resource: AdminResourceName,
) =>
  apiRequest<{ data: T[] }>(`/api/admin/${resource}`, {
    token: getToken(),
    cache: "no-store",
  });

export const createAdminResource = async (
  resource: AdminResourceName,
  values: Record<string, string | number>,
) =>
  apiRequest<AdminRecordResponse<AdminResourceRecord>>(`/api/admin/${resource}`, {
    method: "POST",
    token: getToken(),
    body: values,
  });

export const updateAdminResource = async (
  resource: AdminResourceName,
  id: number,
  values: Record<string, string | number>,
) =>
  apiRequest<AdminRecordResponse<AdminResourceRecord>>(
    `/api/admin/${resource}/${id}`,
    {
      method: "PATCH",
      token: getToken(),
      body: values,
    },
  );

export const deleteAdminResource = async (
  resource: AdminResourceName,
  id: number,
) =>
  apiRequest<ApiMessage>(`/api/admin/${resource}/${id}`, {
    method: "DELETE",
    token: getToken(),
  });

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
