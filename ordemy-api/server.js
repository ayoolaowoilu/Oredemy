import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import { configureChatSocket } from "./src/modules/chat/chat.socket.js";
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

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});