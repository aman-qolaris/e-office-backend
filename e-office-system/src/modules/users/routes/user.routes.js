import { Router } from "express";
import UserController from "../controllers/user.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { restrictTo } from "../../../middlewares/rbac.middleware.js";
import { ROLES } from "../../../config/constants.js";

const router = Router();

router.use(protect);

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: User management and administration
 */

/**
 * @openapi
 * /users/departments:
 *   get:
 *     summary: Get List of Departments for Dropdown
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Maharashtra Mandal"
 *       '401':
 *         description: Unauthorized
 */
// Keep static routes before parameterized routes like /:id
router.get("/departments", UserController.getAllDepartments);

/**
 * @openapi
 * /users/designations:
 *   get:
 *     summary: Get List of Designations for Dropdown
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of designations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *                   example: 7
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "SECRETARY"
 *                       level:
 *                         type: integer
 *                         example: 5
 *       '401':
 *         description: Unauthorized
 */
router.get("/designations", UserController.getAllDesignations);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get List of Users
 *     description: Returns active users (excluding the currently logged-in user)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                   example: 12
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 2
 *                       full_name:
 *                         type: string
 *                         example: "Raju Clerk"
 *                       email:
 *                         type: string
 *                         nullable: true
 *                         example: "raju@mandal.com"
 *                       system_role:
 *                         type: string
 *                         enum: [ADMIN, STAFF, BOARD_MEMBER]
 *                         example: "STAFF"
 *                       designation:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "CLERK"
 *                       department:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Maharashtra Mandal"
 *       '401':
 *         description: Unauthorized
 *   post:
 *     summary: Create a new User (Admin Only)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phoneNumber
 *               - password
 *               - systemRole
 *               - designationId
 *               - departmentId
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Ramesh Gupta"
 *               phoneNumber:
 *                 type: string
 *                 description: 10-digit Indian mobile number
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Secure@123"
 *               systemRole:
 *                 type: string
 *                 enum: [ADMIN, STAFF, BOARD_MEMBER]
 *                 example: "STAFF"
 *               designationId:
 *                 type: integer
 *                 description: Designation ID (from GET /users/designations)
 *                 example: 3
 *               departmentId:
 *                 type: integer
 *                 description: Department ID (from GET /users/departments)
 *                 example: 1
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ramesh@example.com"
 *     responses:
 *       '201':
 *         description: User created successfully
 *       '400':
 *         description: Validation error
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden (You are not an Admin)
 *       '409':
 *         description: User already exists
 */
router.get("/", UserController.getAllUsers);
router.post("/", restrictTo(ROLES.ADMIN), UserController.createUser);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update User Details (Admin Only)
 *     description: Phone number cannot be updated. Use this to update name, role, department, designation, password, or deactivate users.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Raju Clerk"
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *                 example: "raju@mandal.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: "8-16 chars with upper/lower/number/special (no spaces)"
 *               systemRole:
 *                 type: string
 *                 enum: [ADMIN, STAFF, BOARD_MEMBER]
 *                 example: "STAFF"
 *               designationId:
 *                 type: integer
 *                 example: 3
 *               departmentId:
 *                 type: integer
 *                 example: 1
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       '200':
 *         description: User updated successfully
 *       '400':
 *         description: Validation Error (e.g. phoneNumber provided)
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden
 *       '404':
 *         description: User not found
 *       '409':
 *         description: Email already in use
 */
router.patch("/:id", restrictTo(ROLES.ADMIN), UserController.updateUser);

export default router;
