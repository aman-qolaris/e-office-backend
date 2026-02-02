import { Router } from "express";
import FileController from "../controllers/file.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { upload } from "../../../middlewares/upload.middleware.js";

const router = Router();

// Apply Global Protection (Must be logged in)
router.use(protect);

router.get("/inbox", FileController.getInbox);
router.get("/outbox", FileController.getOutbox);
router.get("/:id/history", FileController.getFileHistory);

// POST /api/v1/files
router.post("/", upload.single("puc"), FileController.createFile);

export default router;
