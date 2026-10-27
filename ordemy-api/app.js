import express from "express";
import authRoutes from "./src/modules/auth/auth.routes.js";
import editRoutes from "./src/modules/edit/edit.routes.js";
import  queryRoutes  from "./src/modules/queries/queries.routes.js";
import adminRoutes from "./src/modules/admin/admin.routes.js";
import fetchRoutes from "./src/modules/fetch/fetch.routes.js";
import classRepRoutes from "./src/modules/class-rep/class-rep.routes.js";
import chatRoutes from "./src/modules/chat/chat.routes.js";
import { invalidateCacheOnMutation } from "./src/middleware/response-cache.js";
const app = express();

app.use(express.json());
app.use("/api", invalidateCacheOnMutation);
app.use("/api/auth", authRoutes);
app.use("/api/edit",editRoutes);
app.use("/api/query",queryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/fetch", fetchRoutes);
app.use("/api/class-rep", classRepRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "A record with that unique value already exists" });
  }
  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ message: "A referenced record does not exist" });
  }
  const statusCode = Number.isInteger(error.statusCode)
    ? error.statusCode
    : Number.isInteger(error.status) ? error.status : 500;
  if (statusCode >= 500) console.error(error);
  return res.status(statusCode).json({
    message: statusCode >= 500
      ? "Internal server error"
      : error.type === "entity.parse.failed" ? "Invalid JSON request body" : error.message,
  });
});

export default app;