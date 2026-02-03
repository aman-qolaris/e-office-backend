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
 * /auth/set-pin:
 *   post:
 *     summary: Set a 4-digit Security PIN
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
 *               - pin
 *             properties:
 *               pin:
 *                 type: string
 *                 pattern: '^\d{4}$'
 *                 description: Exactly 4 digits
 *                 example: "1234"
 *     responses:
 *       '200':
 *         description: PIN set successfully
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
 *                   example: "Security PIN set successfully"
 *       '400':
 *         description: Invalid PIN format
 *       '401':
 *         description: Unauthorized (Token missing or invalid)
 */
router.post("/set-pin", protect, AuthController.setPin);

export default router;
