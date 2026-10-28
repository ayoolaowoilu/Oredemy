import { Router } from "express";
import { AddQuery, deleteQuery, getMyDashboard, getMyQueries } from "./queries.controller.js";
import { authenticate } from "../../middleware/auth.js";


 const router = Router();
// /api/query/..
router.post("/add", authenticate, AddQuery)
router.delete("/delete", authenticate, deleteQuery)
router.get("/dashboard", authenticate, getMyDashboard)
router.get("/mine", authenticate, getMyQueries)

export default router;