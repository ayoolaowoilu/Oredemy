import { Router } from "express";
import { AddQuery, deleteQuery, getMyDashboard } from "./queries.controller.js";
import { authenticate } from "../../middleware/auth.js";


 const router = Router();
// /api/query/..
router.post("/add", authenticate, AddQuery)
router.delete("/delete", authenticate, deleteQuery)
router.get("/dashboard", authenticate, getMyDashboard)

export default router;