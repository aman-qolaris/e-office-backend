import {
  sequelize,
  User,
  Department,
  Designation,
} from "../../../database/models/index.js";
import { Op } from "sequelize";
import UserResponseDto from "../dtos/response/UserResponseDto.js";
import AppError from "../../../utils/AppError.js";
import { DESIGNATIONS, ROLES } from "../../../config/constants.js";
import redisClient from "../../../config/redis.js";
import storageService from "../../storage/storage.service.js";

class UserService {
  async createUser(data, signatureFile) {
    if (data.systemRole === ROLES.ADMIN) {
      const adminExists = await User.findOne({
        where: { system_role: ROLES.ADMIN, is_active: true },
      });
      if (adminExists) {
        throw new AppError(
          "System already has an Administrator. Only one Admin is allowed.",
          403,
        );
      }
    }

    // 1. Check for Duplicate Phone Number
    const existingUser = await User.findOne({
      where: { phone_number: data.phoneNumber },
    });
    if (existingUser) {
      throw new AppError("User with this phone number already exists", 409); // 409 Conflict
    }

    // 2. Check if Department Exists
    const department = await Department.findByPk(data.departmentId);
    if (!department) {
      throw new AppError("Department not found", 404);
    }

    const designation = await Designation.findByPk(data.designationId);
    if (!designation) {
      throw new AppError("Designation not found", 404);
    }

    let signatureUrl = null;
    if (signatureFile) {
      // Uploaded directly to MinIO via multer-s3
      if (signatureFile.key) {
        signatureUrl = signatureFile.key;
      } else {
        // Backward compatibility: if some caller still provides a local file or buffer.
        if (signatureFile.path) {
          signatureUrl = await storageService.uploadFileToMinIO(
            signatureFile,
            "signatures/users",
          );
        } else if (signatureFile.buffer) {
          signatureUrl = await storageService.uploadBufferToMinIO(
            signatureFile,
            "signatures/users",
          );
        } else {
          throw new AppError(
            "Signature upload failed: unsupported file payload.",
            500,
          );
        }
      }
    }

    // 3. Create User
    // Note: Password hashing is handled by the 'beforeCreate' hook in User model
    const newUser = await User.create({
      full_name: data.fullName,
      phone_number: data.phoneNumber,
      password: data.password, // Raw password, model will hash it
      system_role: data.systemRole,
      designation_id: data.designationId,
      department_id: data.departmentId,
      email: data.email,
      signature_url: signatureUrl,
      is_active: true,
    });

    // 4. Reload user to get the associated Department data for the response
    await newUser.reload({ include: ["department", "designation"] });

    // 5. Return Sanitized DTO
    return new UserResponseDto(newUser);
  }

  async updateUser(currentUser, userId, data) {
    const transaction = await sequelize.transaction();
    try {
      // Defense in depth: protect admin elevation at the service layer
      if (data.systemRole === ROLES.ADMIN) {
        if (!currentUser || currentUser.system_role !== ROLES.ADMIN) {
          throw new AppError(
            "CRITICAL: Unauthorized attempt to grant Admin privileges.",
            403,
          );
        }
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      // =========================================================
      // 1. ADMIN ROLE SWAP (Presidential Power)
      // =========================================================
      // If setting a NEW Admin, demote the OLD Admin to Staff.
      await this._handleAdminRoleSwap(user, data, transaction);

      // ---------------------------------------------------------
      // 2. DESIGNATION & SEAT SWAP LOGIC
      // ---------------------------------------------------------
      let newDesignation = null;

      // Check if designation is changing
      if (data.designationId && data.designationId !== user.designation_id) {
        newDesignation = await Designation.findByPk(data.designationId, {
          transaction,
        });
        if (!newDesignation) throw new AppError("Designation not found", 404);

        const targetDepartmentId = data.departmentId || user.department_id;
        await this._handleSeatReallocation(
          userId,
          newDesignation,
          targetDepartmentId,
          transaction,
        );
      }
      // Validation: If designation ID provided but NOT changing, just verify it exists
      else if (data.designationId) {
        newDesignation = await Designation.findByPk(data.designationId, {
          transaction,
        });
        if (!newDesignation) throw new AppError("Designation not found", 404);
      }

      const oldDesignationId = user.designation_id;
      const isDesignationChanging =
        data.designationId && data.designationId !== user.designation_id;

      if (data.departmentId) {
        const department = await Department.findByPk(data.departmentId, {
          transaction,
        });
        if (!department) throw new AppError("Department not found", 404);
      }

      if (data.email && data.email !== user.email) {
        const emailExists = await User.findOne({
          where: { email: data.email, id: { [Op.ne]: userId } },
          transaction,
        });
        if (emailExists) {
          throw new AppError("Email already in use by another user", 409);
        }
      }

      Object.assign(user, {
        full_name: data.fullName || user.full_name,
        email: data.email !== undefined ? data.email : user.email,
        system_role: data.systemRole || user.system_role,
        designation_id: data.designationId || user.designation_id,
        department_id: data.departmentId || user.department_id,
        is_active: data.isActive !== undefined ? data.isActive : user.is_active,
      });

      await user.save({ transaction });

      if (isDesignationChanging) {
        const remainingUsersCount = await User.count({
          where: { designation_id: oldDesignationId },
          transaction,
        });

        if (remainingUsersCount === 0) {
          await Designation.update(
            { level: 50 },
            { where: { id: oldDesignationId }, transaction },
          );
        }
      }

      await transaction.commit(); // 6. Commit

      await redisClient.del(`user:${userId}`);

      await user.reload({ include: ["department", "designation"] });
      return new UserResponseDto(user);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async _handleAdminRoleSwap(user, data, transaction) {
    if (data.systemRole !== ROLES.ADMIN || user.system_role === ROLES.ADMIN) {
      return;
    }

    const currentAdmin = await User.findOne({
      where: { system_role: ROLES.ADMIN, is_active: true },
      transaction,
    });

    if (!currentAdmin) return;

    currentAdmin.system_role = ROLES.STAFF;
    await currentAdmin.save({ transaction });
  }

  async _handleSeatReallocation(
    userId,
    newDesignation,
    targetDepartmentId,
    transaction,
  ) {
    const multiUserDesignations = [DESIGNATIONS.MEMBER, DESIGNATIONS.CLERK];
    if (multiUserDesignations.includes(newDesignation.name)) return;

    const existingHolder = await User.findOne({
      where: {
        designation_id: newDesignation.id,
        department_id: targetDepartmentId,
        id: { [Op.ne]: userId },
        is_active: true,
      },
      transaction,
    });

    if (!existingHolder) return;

    const memberDesignation = await Designation.findOne({
      where: { name: DESIGNATIONS.MEMBER },
      transaction,
    });

    if (!memberDesignation) {
      throw new AppError(
        "System Error: 'MEMBER' designation not found. Cannot auto-demote.",
        500,
      );
    }

    existingHolder.designation_id = memberDesignation.id;
    await existingHolder.save({ transaction });
  }

  async getAllUsers(currentUserId, searchQuery = null, page = 1, limit = 50) {
    const pageNum = Number.isFinite(Number(page)) ? parseInt(page) : 1;
    const limitNum = Number.isFinite(Number(limit)) ? parseInt(limit) : 50;
    const safePage = pageNum > 0 ? pageNum : 1;
    const safeLimit = Math.min(Math.max(limitNum, 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const whereClause = {
      id: { [Op.ne]: currentUserId },
      is_active: true,
    };

    const q = typeof searchQuery === "string" ? searchQuery.trim() : "";
    if (q) {
      whereClause[Op.or] = [
        // Prefix search allows DB index usage (no leading wildcard)
        { full_name: { [Op.like]: `${q}%` } },
        { "$designation.name$": { [Op.like]: `${q}%` } },
      ];
    }

    const { rows: users, count: total } = await User.findAndCountAll({
      where: whereClause,
      limit: safeLimit,
      offset,
      distinct: true,
      attributes: ["id", "full_name","phone_number", "email", "system_role", "is_active"],
      include: [
        {
          model: Designation,
          as: "designation",
          attributes: ["id","name"],
        },
        {
          model: Department,
          as: "department",
          attributes: ["id","name"],
        },
      ],
      order: [["full_name", "ASC"]],
      subQuery: false,
    });

    return {
      data: users,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getAllDepartments() {
    // 1. Check if data exists in Redis cache
    const cachedDepartments = await redisClient.get("departments:all");
    if (cachedDepartments) {
      return JSON.parse(cachedDepartments); // Return lightning-fast cached data
    }

    // Fetch only ID and Name to keep it lightweight for dropdowns
    const departments = await Department.findAll({
      attributes: ["id", "name"],
      where: { is_active: true }, // Optional: Only show active depts
    });

    // 3. Save the result to Redis for future requests
    // setEx saves it with a time-to-live. 86400 seconds = 24 hours.
    await redisClient.setEx(
      "departments:all",
      86400,
      JSON.stringify(departments),
    );

    return departments;
  }

  async getAllDesignations(currentUser) {
    let showSystemAdmin = false;

    if (
      currentUser &&
      currentUser.designation?.name === DESIGNATIONS.PRESIDENT
    ) {
      showSystemAdmin = true;
    }

    // Define cache key based on role context
    const cacheKey = showSystemAdmin
      ? "designations:president"
      : "designations:standard";

    // 1. Check Redis cache
    const cachedDesignations = await redisClient.get(cacheKey);
    if (cachedDesignations) {
      return JSON.parse(cachedDesignations);
    }

    // 2. Fetch from MySQL
    const whereClause = { is_active: true };
    if (!showSystemAdmin) {
      whereClause.name = { [Op.ne]: DESIGNATIONS.SYSTEM_ADMIN };
    }

    const designations = await Designation.findAll({
      where: whereClause,
      attributes: ["id", "name", "level"],
      order: [["level", "DESC"]],
    });

    // 3. Save to Redis
    await redisClient.setEx(cacheKey, 86400, JSON.stringify(designations));

    return designations;
  }

  async createDepartment(data) {
    // 1. Check for Duplicate Name
    const existingDept = await Department.findOne({
      where: { name: data.name },
    });
    if (existingDept) {
      throw new AppError(`Department '${data.name}' already exists`, 409);
    }

    // 2. Create
    const newDept = await Department.create({
      name: data.name,
      description: data.description,
      is_active: true,
    });

    await redisClient.del("departments:all");

    return newDept;
  }

  async createDesignation(data) {
    // 1. Force Name to Uppercase (Fixes the issue)
    const normalizedName = data.name.trim().toUpperCase();

    // 2. Check for Duplicate Name
    const existingDesig = await Designation.findOne({
      where: { name: normalizedName },
    });
    if (existingDesig) {
      throw new AppError(`Designation '${normalizedName}' already exists`, 409);
    }

    // 3. Create
    const newDesig = await Designation.create({
      name: normalizedName, // Save as "CLERK", not "Clerk"
      level: data.level,
      is_active: true,
    });

    await redisClient.del(["designations:president", "designations:standard"]);

    return newDesig;
  }
}

export default new UserService();
