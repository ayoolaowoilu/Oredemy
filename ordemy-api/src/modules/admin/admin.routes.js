import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/auth.js";
import {
    createResource,
    deleteResource,
    listPendingLecturers,
    listResource,
    setLecturerVerification,
    updateResource,
} from "./admin.controller.js";
import { cacheSuccessfulGet } from "../../middleware/response-cache.js";

const router = Router();
const adminOnly = [authenticate, requireAdmin];

router.get("/lecturers/pending", ...adminOnly, listPendingLecturers);
router.patch("/lecturers/:id/verification", ...adminOnly, setLecturerVerification);
router.get("/:resource", ...adminOnly, cacheSuccessfulGet, listResource);
router.post("/:resource", ...adminOnly, createResource);
router.patch("/:resource/:id", ...adminOnly, updateResource);
router.delete("/:resource/:id", ...adminOnly, deleteResource);

export default router;
