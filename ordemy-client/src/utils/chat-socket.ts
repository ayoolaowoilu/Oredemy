import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { tokenStorage } from "../lib/api";

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
let consumerCount = 0;

export function connectChatSocket() {
  const token = tokenStorage.get();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  if (sharedSocket && sharedToken !== token) {
    sharedSocket.disconnect();
    sharedSocket = null;
    sharedToken = null;
    consumerCount = 0;
  }
  if (sharedSocket) {
    consumerCount += 1;
    return sharedSocket;
  }
  const configuredUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:8081")
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
  // In dev, connect to the Vite proxy on the same origin (no CORS on LAN).
  sharedSocket = io(import.meta.env.DEV ? undefined : configuredUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 6,
  });
  sharedToken = token;
  consumerCount = 1;
  return sharedSocket;
}

export function disconnectChatSocket(socket: Socket) {
  if (socket !== sharedSocket) return;
  consumerCount = Math.max(0, consumerCount - 1);
  if (consumerCount === 0) {
    socket.disconnect();
    sharedSocket = null;
    sharedToken = null;
  }
}
