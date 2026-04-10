import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { authLimiter } from "../../../middlewares/rateLimiter.middleware.js";

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
 *       "200":
 *         description: Login successful (sets HttpOnly cookie "jwt")
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly cookie containing the JWT token
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         fullName:
 *                           type: string
 *                           example: Admin User
 *                         phoneNumber:
 *                           type: string
 *                           example: "9876543210"
 *                         systemRole:
 *                           type: string
 *                           example: ADMIN
 *                         designation:
 *                           type: string
 *                           nullable: true
 *                           example: PRESIDENT
 *                         department:
 *                           type: string
 *                           nullable: true
 *                           example: IT Cell
 *                         isPinSet:
 *                           type: boolean
 *                           example: false
 *       "401":
 *         description: Invalid credentials
 *       "403":
 *         description: Account is disabled
 *       "400":
 *         description: Validation error (invalid phoneNumber/password format)
 *       "429":
 *         description: Too many authentication attempts
 */
router.post("/login", authLimiter, AuthController.login);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout of the system (clears HttpOnly cookie)
 *     tags:
 *       - Auth
 *     responses:
 *       "200":
 *         description: Logged out successfully
 *         headers:
 *           Set-Cookie:
 *             description: Clears the JWT cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
router.post("/logout", AuthController.logout);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset OTP/token
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
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: 10-digit Indian mobile number
 *                 example: "9876543210"
 *     responses:
 *       "200":
 *         description: Reset instructions sent
 *       "400":
 *         description: Validation error (invalid phoneNumber)
 *       "404":
 *         description: User not found
 *       "429":
 *         description: Too many authentication attempts
 */
router.post("/forgot-password", authLimiter, AuthController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using OTP/token
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
 *               - otp
 *               - newPassword
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "9876543210"
 *               otp:
 *                 type: string
 *                 description: OTP/token received for password reset
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New strong password
 *                 example: NewPass@123
 *     responses:
 *       "200":
 *         description: Password reset successfully
 *       "400":
 *         description: Invalid or expired OTP/token
 *       "404":
 *         description: User not found
 *       "429":
 *         description: Too many authentication attempts
 */
router.post("/reset-password", authLimiter, AuthController.resetPassword);

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
router.post("/set-pin", authLimiter, protect, AuthController.setPin);

router.get("/me", protect, AuthController.getMe);

export default router;
