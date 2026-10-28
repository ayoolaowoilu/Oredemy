import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
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
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await stopAdviserBatchScheduler();
  } catch (error) {
    console.error("[adviser-ai] Scheduler shutdown logging failed:", error);
  }
  io.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});