import { Router } from "express";
import { authenticate, requireVerifiedLecturer } from "../../middleware/auth.js";
import { listMyRequests, listRequests, reviewRequest, submitRequest } from "./class-rep.controller.js";

const router = Router();

router.post("/requests", authenticate, submitRequest);
router.get("/requests/mine", authenticate, listMyRequests);
router.get("/requests", authenticate, requireVerifiedLecturer, listRequests);
router.patch("/requests/:id", authenticate, requireVerifiedLecturer, reviewRequest);

export default router;
