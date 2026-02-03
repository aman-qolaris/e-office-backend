import { Router } from "express";
import FileController from "../controllers/file.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { upload } from "../../../middlewares/upload.middleware.js";

const router = Router();

// Apply Global Protection (Must be logged in)
router.use(protect);

router.get("/inbox", FileController.getInbox);
router.get("/outbox", FileController.getOutbox);
router.get("/search", FileController.searchFiles);
router.get("/stats", FileController.getDashboardStats);
router.get("/:id/history", FileController.getFileHistory);

// POST /api/v1/files
// router.post("/", upload.single("puc"), FileController.createFile);

router.post(
  "/",
  protect,
  upload.fields([
    { name: "puc", maxCount: 1 }, // The Main Letter (Mandatory)
    { name: "attachments", maxCount: 5 }, // Supporting Docs (Optional, max 5)
  ]),
  FileController.createFile,
);

export default router;
