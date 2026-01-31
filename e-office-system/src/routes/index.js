import { Router } from "express";
import authRoutes from "../modules/auth/routes/auth.routes.js";

const router = Router();

// Mount Auth Module
router.use("/auth", authRoutes);

// Future modules will go here:
// router.use('/users', userRoutes);
// router.use('/files', fileRoutes);

export default router;
