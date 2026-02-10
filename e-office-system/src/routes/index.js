import { Router } from "express";
import authRoutes from "../modules/auth/routes/auth.routes.js";
import userRoutes from "../modules/users/routes/user.routes.js";
import fileRoutes from "../modules/e-file/routes/file.routes.js";
import workflowRoutes from "../modules/workflow/routes/workflow.routes.js";
import * as allConstants from "../config/constants.js";

const router = Router();

router.get("/constants", (req, res) => {
  const safeConstants = { ...allConstants };

  if (safeConstants.ROLES) {
    const { ADMIN, ...publicRoles } = safeConstants.ROLES;
    safeConstants.ROLES = publicRoles;
  }

  res.status(200).json({
    success: true,
    data: safeConstants,
  });
});

// Mount Auth Module
router.use("/auth", authRoutes);

// Future modules will go here:
router.use("/users", userRoutes);
router.use("/files", fileRoutes);
router.use("/workflow", workflowRoutes);

export default router;
