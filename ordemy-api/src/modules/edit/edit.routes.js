import { Router } from "express";
import { EditQuery, EditUser } from "./edit.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
// uses /api/edit/...
router.post("/user", authenticate, EditUser);
router.post("/query", authenticate, EditQuery)
export default router;