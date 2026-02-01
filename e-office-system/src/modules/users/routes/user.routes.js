import { Router } from "express";
import UserController from "../controllers/user.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { restrictTo } from "../../../middlewares/rbac.middleware.js";
import { ROLES } from "../../../config/constants.js";

const router = Router();

// Apply Global Protection to all routes in this file
router.use(protect);

// POST /api/v1/users
// Only ADMIN can create users
router.post("/", restrictTo(ROLES.ADMIN), UserController.createUser);

export default router;
