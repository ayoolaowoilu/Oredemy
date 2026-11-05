import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
    getPushConfiguration,
    removePushSubscription,
    savePushSubscription,
} from "./notifications.controller.js";

const router = Router();

router.use(authenticate);
router.get("/push-config", getPushConfiguration);
router.post("/push-subscriptions", savePushSubscription);
router.delete("/push-subscriptions", removePushSubscription);

export default router;
