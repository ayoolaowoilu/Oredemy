import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/auth.js";
import {
    createResource,
    deleteResource,
    listResource,
    updateResource,
} from "./admin.controller.js";

const router = Router();
const adminOnly = [authenticate, requireAdmin];

router.get("/:resource", ...adminOnly, listResource);
router.post("/:resource", ...adminOnly, createResource);
router.patch("/:resource/:id", ...adminOnly, updateResource);
router.delete("/:resource/:id", ...adminOnly, deleteResource);

export default router;
