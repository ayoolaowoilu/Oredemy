import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import app from "./app.js";
import { configureChatSocket } from "./src/modules/chat/chat.socket.js";
import { startAdviserBatchScheduler, stopAdviserBatchScheduler } from "./src/modules/adviser/adviser-batch.scheduler.js";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 8081;
const httpServer = createServer(app);
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : "*";
const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins },
});

configureChatSocket(io);
void startAdviserBatchScheduler().catch((error) => {
  console.error("[adviser-ai] Scheduler could not start:", error);
});

let shuttingDown = false;
let socketRedisClients = [];
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await stopAdviserBatchScheduler();
  } catch (error) {
    console.error("[adviser-ai] Scheduler shutdown logging failed:", error);
  }
  io.close(() => {
    void Promise.all(socketRedisClients.map((client) => client.quit()))
      .catch((error) => console.error("[socket.io] Redis shutdown failed:", error))
      .finally(() => process.exit(0));
  });
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

async function startServer() {
  const socketRedisEnabled = (process.env.SOCKET_REDIS_ENABLED ?? "false").toLowerCase();
  if (!["true", "false"].includes(socketRedisEnabled)) {
    throw new Error("SOCKET_REDIS_ENABLED must be true or false");
  }
  if (socketRedisEnabled === "true") {
    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL is required when SOCKET_REDIS_ENABLED=true");
    }
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    pubClient.on("error", (error) => console.error("[socket.io] Redis publisher error:", error));
    subClient.on("error", (error) => console.error("[socket.io] Redis subscriber error:", error));
    await Promise.all([pubClient.connect(), subClient.connect()]);
    socketRedisClients = [pubClient, subClient];
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[socket.io] Redis adapter enabled");
  }
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

void startServer().catch((error) => {
  console.error("[server] Could not start:", error);
  process.exitCode = 1;
});