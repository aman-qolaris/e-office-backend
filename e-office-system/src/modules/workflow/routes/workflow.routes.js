import { Router } from "express";
import WorkflowController from "../controllers/workflow.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";

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
 *     summary: Move a file (Forward, Revert, or Approve)
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
 *               - receiverId
 *               - action
 *               - remarks
 *             properties:
 *               receiverId:
 *                 type: integer
 *                 description: Target User ID (Who receives the file)
 *                 example: 2
 *               action:
 *                 type: string
 *                 description: The movement action to perform
 *                 enum: [FORWARD, REVERT, APPROVE, REJECT]
 *                 example: "FORWARD"
 *               remarks:
 *                 type: string
 *                 description: Mandatory comments for the audit trail
 *                 example: "Forwarding to President for final approval."
 *               pin:
 *                 type: string
 *                 description: 4-digit security PIN (Required for APPROVE/REJECT)
 *                 example: "1234"
 *     responses:
 *       '200':
 *         description: File moved successfully
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
 *                   example: "File forwarded successfully"
 *       '400':
 *         description: Validation Error (Invalid Action or Missing Remarks)
 *       '403':
 *         description: Unauthorized (Wrong PIN or Not Allowed)
 *       '404':
 *         description: File not found
 */

// POST /api/v1/workflow/files/:id/move
router.post("/files/:id/move", WorkflowController.moveFile);

export default router;
