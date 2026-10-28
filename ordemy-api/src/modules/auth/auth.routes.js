import { Router } from "express"
import { AdviserOnboarding, login, Register, UserData } from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
// note it uses /api/auth/... -> and the likes , so yeah
router.post("/login",login);
router.post("/register",Register)
router.get("/userdata", authenticate, UserData)
router.post("/adviser-onboarding", authenticate, AdviserOnboarding)

export default router;