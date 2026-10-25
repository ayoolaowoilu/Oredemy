import { Router } from "express";
import { AddQuery, deleteQuery } from "./queries.controller.js";
import { authenticate } from "../../middleware/auth.js";


 const router = Router();
// /api/query/..
router.post("/add", authenticate, AddQuery)
router.delete("/delete", authenticate, deleteQuery)

export default router;