import { io } from "socket.io-client";
import { tokenStorage } from "../lib/api";

export function connectChatSocket() {
  const token = tokenStorage.get();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const configuredUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:8081")
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
  // In dev, connect to the Vite proxy on the same origin (no CORS on LAN).
  return io(import.meta.env.DEV ? undefined : configuredUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 6,
  });
}
