import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";

const router = Router();

// POST /api/v1/auth/login
router.post("/login", AuthController.login);

export default router;
