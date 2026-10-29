import "dotenv/config";
import express from "express";
import authRoutes from "./src/modules/auth/auth.routes.js";
import editRoutes from "./src/modules/edit/edit.routes.js";
import  queryRoutes  from "./src/modules/queries/queries.routes.js";
import adminRoutes from "./src/modules/admin/admin.routes.js";
import fetchRoutes from "./src/modules/fetch/fetch.routes.js";
import classRepRoutes from "./src/modules/class-rep/class-rep.routes.js";
import chatRoutes from "./src/modules/chat/chat.routes.js";
import adviserRoutes from "./src/modules/adviser/adviser.routes.js";
import courseRoutes from "./src/modules/courses/course.routes.js";
import { invalidateCacheOnMutation } from "./src/middleware/response-cache.js";
const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://127.0.0.1:5173" , "https://ordemy.netlify.app/"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowAll = allowedOrigins.includes("*");
  const allowed = allowAll || (origin && allowedOrigins.includes(origin));

  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", allowAll ? "*" : origin);
    if (!allowAll) {
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-token");

  // answer preflight immediately
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use("/api", invalidateCacheOnMutation);
app.use("/api/auth", authRoutes);
app.use("/api/edit",editRoutes);
app.use("/api/query",queryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/fetch", fetchRoutes);
app.use("/api/class-rep", classRepRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/adviser", adviserRoutes);
app.use("/api/courses", courseRoutes);

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