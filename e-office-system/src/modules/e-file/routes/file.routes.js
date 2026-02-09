import { Router } from "express";
import FileController from "../controllers/file.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { restrictTo } from "../../../middlewares/rbac.middleware.js";
import { upload } from "../../../middlewares/upload.middleware.js";
import { ROLES } from "../../../config/constants.js";

const router = Router();

// Apply Global Protection (Must be logged in)
router.use(protect);

/**
 * @openapi
 * tags:
 *   - name: Files
 *     description: File creation, inbox, and searching
 */

/**
 * @openapi
 * /files/inbox:
 *   get:
 *     summary: Get my Inbox (Pending Files)
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of files currently held by the user's position (designation + department)
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
 *                   example: Inbox fetched successfully
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */

router.get("/inbox", FileController.getInbox);

/**
 * @openapi
 * /files/outbox:
 *   get:
 *     summary: Get my Outbox (Files I created)
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of files the user has sent/moved away
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
 *                   example: Outbox fetched successfully
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/outbox", FileController.getOutbox);

/**
 * @openapi
 * /files/search:
 *   get:
 *     summary: Search for files
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: text
 *         schema:
 *           type: string
 *         description: Search by Subject or File Number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT]
 *         description: Filter by file status (currently supported: DRAFT)
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *     responses:
 *       '200':
 *         description: Search results (department-scoped)
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
 *                   example: Files searched successfully
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/search", FileController.searchFiles);

/**
 * @openapi
 * /files/stats:
 *   get:
 *     summary: Get Dashboard Statistics
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Counts used for dashboard cards
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
 *                   example: Dashboard stats fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     pending:
 *                       type: integer
 *                       example: 3
 *                     created:
 *                       type: integer
 *                       example: 10
 *                     approved:
 *                       type: integer
 *                       example: 0
 *                     rejected:
 *                       type: integer
 *                       example: 0
 *                     reverted:
 *                       type: integer
 *                       example: 0
 */
router.get("/stats", FileController.getDashboardStats);

/**
 * @openapi
 * /files/{id}/history:
 *   get:
 *     summary: Get movement history of a specific file
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     responses:
 *       '200':
 *         description: Audit trail of the file
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
 *                   example: File history fetched successfully
 *                 data:
 *                   type: object
 */
router.get("/:id/history", FileController.getFileHistory);

// POST /api/v1/files
// router.post("/", upload.single("puc"), FileController.createFile);

/**
 * @openapi
 * /files:
 *   post:
 *     summary: Create a new E-File with Attachments
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - puc
 *             properties:
 *               subject:
 *                 type: string
 *                 description: The main subject of the file
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *                 default: LOW
 *               type:
 *                 type: string
 *                 enum: [GENERIC, FINANCIAL, POLICY]
 *                 default: GENERIC
 *               puc:
 *                 type: string
 *                 format: binary
 *                 description: Main PDF File (Required)
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Extra supporting documents (Max 10)
 *     responses:
 *       '201':
 *         description: File created successfully
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
 *                   example: e-File created successfully
 *                 data:
 *                   type: object
 *       '400':
 *         description: Missing PUC or validation error
 *       '403':
 *         description: Forbidden
 */

router.post(
  "/",
  restrictTo(ROLES.STAFF, ROLES.BOARD_MEMBER),
  upload.fields([
    { name: "puc", maxCount: 1 }, // The Main Letter (Mandatory)
    { name: "attachments", maxCount: 10 }, // Supporting Docs (Optional, max 10)
  ]),
  FileController.createFile,
);

/**
 * @openapi
 * /files/{id}/sign:
 *   post:
 *     summary: Upload signed document (President only)
 *     description: Requires BOARD_MEMBER system role; service layer enforces PRESIDENT designation and current-holder checks.
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - signed_doc
 *             properties:
 *               signed_doc:
 *                 type: string
 *                 format: binary
 *                 description: Signed PDF document
 *     responses:
 *       '200':
 *         description: Signed document uploaded
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
 *                   example: Signed document uploaded successfully.
 *                 url:
 *                   type: string
 *                   description: MinIO object key/path
 *       '400':
 *         description: Signed document missing or validation error
 *       '403':
 *         description: Forbidden
 *       '404':
 *         description: File not found
 */
router.post(
  "/:id/sign",
  restrictTo(ROLES.BOARD_MEMBER),
  upload.single("signed_doc"),
  FileController.uploadSignedDoc,
);

/**
 * @openapi
 * /files/{id}/attachment:
 *   post:
 *     summary: Add extra attachment to a file (Board/President)
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - attachments
 *             properties:
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Attachment PDFs (Max 10)
 *     responses:
 *       '201':
 *         description: Attachment(s) added
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
 *                   example: Attachments added successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       '400':
 *         description: Attachment missing or validation error
 *       '403':
 *         description: Forbidden
 *       '404':
 *         description: File not found
 */
router.post(
  "/:id/attachment",
  restrictTo(ROLES.BOARD_MEMBER),
  upload.array("attachments", 10),
  FileController.addAttachment,
);

/**
 * @openapi
 * /files/attachment/{attachmentId}:
 *   delete:
 *     summary: Remove an attachment (Board/President)
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attachment ID
 *     responses:
 *       '200':
 *         description: Attachment removed
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
 *                   example: Attachment removed successfully
 *       '403':
 *         description: Forbidden
 *       '404':
 *         description: Attachment not found
 */
router.delete(
  "/attachment/:attachmentId",
  restrictTo(ROLES.BOARD_MEMBER),
  FileController.removeAttachment,
);

/**
 * @openapi
 * /files/{id}/download-puc:
 *   get:
 *     summary: Download main PUC (PDF)
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     responses:
 *       '200':
 *         description: PUC file stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       '403':
 *         description: Forbidden
 *       '404':
 *         description: File or PUC not found
 */
router.get("/:id/download-puc", FileController.downloadPuc);

/**
 * @openapi
 * /files/attachment/{attachmentId}/download:
 *   get:
 *     summary: Download a specific attachment
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attachment ID
 *     responses:
 *       '200':
 *         description: Attachment file stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       '403':
 *         description: Forbidden
 *       '404':
 *         description: Attachment not found
 */
router.get(
  "/attachment/:attachmentId/download",
  FileController.downloadAttachment,
);

/**
 * @openapi
 * /files/{id}/download-signed:
 *   get:
 *     summary: Download signed document (President's copy)
 *     tags:
 *       - Files
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     responses:
 *       '200':
 *         description: Signed document file stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       '403':
 *         description: Forbidden
 *       '404':
 *         description: Signed document not found
 */
router.get("/:id/download-signed", FileController.downloadSignedDoc);

export default router;
