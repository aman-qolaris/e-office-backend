import { Router } from "express";
import FileController from "../controllers/file.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { upload } from "../../../middlewares/upload.middleware.js";

const router = Router();

// Apply Global Protection (Must be logged in)
router.use(protect);

// POST /api/v1/files
// Middleware Order:
// 1. protect (Check Token)
// 2. upload.single('puc') (Handle File Upload)
// 3. Controller (Logic)
router.post("/", upload.single("puc"), FileController.createFile);

export default router;
