import { Router } from "express";
import WorkflowController from "../controllers/workflow.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

// POST /api/v1/workflow/files/:id/move
router.post("/files/:id/move", WorkflowController.moveFile);

export default router;
