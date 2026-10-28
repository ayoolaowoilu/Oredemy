const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8081"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");
const TOKEN_KEY = "ordemy_token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Fired when a request made WITH a token comes back 401 (expired/invalid).
export const UNAUTHORIZED_EVENT = "ordemy:unauthorized";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, token, cache }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(result.message ?? "Request failed", response.status);
  }

  return result as T;
}