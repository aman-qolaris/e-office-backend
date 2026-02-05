import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: User authentication and security
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login to the system
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - password
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: 10-digit Indian mobile number
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Strong password
 *                 example: "Admin@123"
 *     responses:
 *       '200':
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT Bearer Token
 *                     user:
 *                       type: object
 *                       properties:
 *                         fullName:
 *                           type: string
 *                         systemRole:
 *                           type: string
 *       '401':
 *         description: Invalid credentials
 */
router.post("/login", AuthController.login);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     summary: Change login password
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 description: Strong password (8-16 chars, uppercase, lowercase, number, special)
 *     responses:
 *       "200":
 *         description: Password changed successfully
 *       "401":
 *         description: Incorrect current password
 */
router.post("/change-password", protect, AuthController.changePassword);

/**
 * @openapi
 * /auth/set-pin:
 *   post:
 *     summary: Set or update 4-digit security PIN (2FA)
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - newPin
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current login password for verification
 *               newPin:
 *                 type: string
 *                 pattern: '^\\d{4}$'
 *                 description: New 4-digit PIN
 *     responses:
 *       "200":
 *         description: PIN updated successfully
 *       "400":
 *         description: New PIN cannot be the same as old PIN
 *       "401":
 *         description: Invalid password provided
 */
router.post("/set-pin", protect, AuthController.setPin);

export default router;
