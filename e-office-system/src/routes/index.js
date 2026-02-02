import { Router } from "express";
import authRoutes from "../modules/auth/routes/auth.routes.js";
import userRoutes from "../modules/users/routes/user.routes.js";
import fileRoutes from "../modules/e-file/routes/file.routes.js";
import workflowRoutes from "../modules/workflow/routes/workflow.routes.js";

const router = Router();

// Mount Auth Module
router.use("/auth", authRoutes);

// Future modules will go here:
router.use("/users", userRoutes);
router.use("/files", fileRoutes);
router.use("/workflow", workflowRoutes);

export default router;
