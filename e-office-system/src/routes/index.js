import { Router } from "express";
import jwt from "jsonwebtoken";
import { promisify } from "util";
import { User, Designation } from "../database/models/index.js";
import authRoutes from "../modules/auth/routes/auth.routes.js";
import userRoutes from "../modules/users/routes/user.routes.js";
import fileRoutes from "../modules/e-file/routes/file.routes.js";
import workflowRoutes from "../modules/workflow/routes/workflow.routes.js";
import * as allConstants from "../config/constants.js";

const router = Router();

router.get("/constants", async (req, res) => {
  const safeConstants = {
    ...allConstants,
    ROLES: { ...allConstants.ROLES },
  };

  let showHiddenOptions = false;

  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET,
      );

      const currentUser = await User.findByPk(decoded.id, {
        include: [{ model: Designation, as: "designation" }],
      });

      if (
        currentUser &&
        currentUser.designation?.name === allConstants.DESIGNATIONS.PRESIDENT
      ) {
        showHiddenOptions = true;
      }
    }
  } catch (err) {
    showHiddenOptions = false;
  }
  if (!showHiddenOptions) {
    delete safeConstants.ROLES.ADMIN;
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
