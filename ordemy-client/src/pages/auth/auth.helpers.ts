import { apiRequest } from "../../lib/api";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  UserProfile,
} from "../../types/auth";

export const loginRequest = (userData: LoginPayload) =>
  apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { userData },
  });

export const registerRequest = (userData: RegisterPayload) =>
  apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: { userData },
  });

export const fetchProfile = (token: string) =>
  apiRequest<UserProfile>("/api/auth/userdata", { token });

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPassword = (password: string) =>
  password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password);