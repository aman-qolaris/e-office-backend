import { Router } from "express";
import WorkflowController from "../controllers/workflow.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { restrictTo } from "../../../middlewares/rbac.middleware.js";
import { ROLES } from "../../../config/constants.js";

const router = Router();

router.use(protect);

/**
 * @openapi
 * tags:
 *   - name: Workflow
 *     description: Managing file movements (Forward, Revert, Approve)
 */

/**
 * @openapi
 * /workflow/files/{id}/move:
 *   post:
 *     summary: Move a file to another user or verify it
 *     tags:
 *       - Workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique ID of the file to move
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - remarks
 *             properties:
 *               receiverId:
 *                 type: integer
 *                 description: Target User ID (required for actions other than VERIFY)
 *                 example: 2
 *               action:
 *                 type: string
 *                 description: The movement action to perform
 *                 enum: [FORWARD, VERIFY]
 *                 example: "FORWARD"
 *               remarks:
 *                 type: string
 *                 description: Mandatory comments for the audit trail
 *                 example: "Forwarding to President for final approval."
 *               pin:
 *                 type: string
 *                 description: Optional 4-digit security PIN (validated only if the backend enforces it for specific actions)
 *                 example: "1234"
 *     responses:
 *       '200':
 *         description: File moved/verified successfully
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
 *                   example: "File moved successfully"
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: "File moved successfully"
 *                         newHolderId:
 *                           type: integer
 *                           example: 2
 *                     - type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: "File verified successfully."
 *       '400':
 *         description: Validation/Business Rule Error (e.g., missing remarks, receiverId required, verification rules)
 *       '403':
 *         description: Forbidden (role/hierarchy violation or not allowed to move this file)
 *       '404':
 *         description: File not found (or receiver not found)
 *       '500':
 *         description: Internal Server Error
 */

// POST /api/v1/workflow/files/:id/move
router.post(
  "/files/:id/move",
  restrictTo(ROLES.STAFF, ROLES.BOARD_MEMBER),
  WorkflowController.moveFile,
);

export default router;
