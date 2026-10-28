export type UserRole = "student" | "lecturer" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  message: string;
}

export interface UserProfile extends AuthUser {
  session: string | null;
  admission_session: string | null;
  faculty_id: number | null;
  department_id: number | null;
  faculty: string | null;
  department: string | null;
  created_at: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
  role?: "student" | "lecturer";
}