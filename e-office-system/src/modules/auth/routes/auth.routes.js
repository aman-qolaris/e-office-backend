import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";

const router = Router();

// POST /api/v1/auth/login
router.post("/login", AuthController.login);
router.post("/set-pin", protect, AuthController.setPin);

export default router;
