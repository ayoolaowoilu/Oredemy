import { Router } from "express";
import { authenticate, requireVerifiedLecturer } from "../../middleware/auth.js";
import {
    listMyRequests,
    listRepresentatives,
    listRequests,
    reviewRequest,
    revokeRepresentative,
    submitRequest,
} from "./class-rep.controller.js";

const router = Router();

router.post("/requests", authenticate, submitRequest);
router.get("/requests/mine", authenticate, listMyRequests);
router.get("/requests", authenticate, requireVerifiedLecturer, listRequests);
router.get("/representatives", authenticate, requireVerifiedLecturer, listRepresentatives);
router.patch("/requests/:id/revoke", authenticate, requireVerifiedLecturer, revokeRepresentative);
router.patch("/requests/:id", authenticate, requireVerifiedLecturer, reviewRequest);

export default router;
