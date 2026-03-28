import path from "path";
import { minioClient, BUCKET_NAME } from "../../../config/minio.js";
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
        // Backward compatibility: if some caller still provides a local file.
        const ext = path.extname(signatureFile.originalname);
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
        const objectName = `signatures/users/${uniqueSuffix}${ext}`;
        await minioClient.putObject(
          BUCKET_NAME,
          objectName,
          signatureFile.buffer,
          signatureFile.size,
        );
        signatureUrl = objectName;
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

  async updateUser(userId, data) {
    const transaction = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      // =========================================================
      // 1. ADMIN ROLE SWAP (Presidential Power)
      // =========================================================
      // If setting a NEW Admin, demote the OLD Admin to Staff.
      if (data.systemRole === ROLES.ADMIN && user.system_role !== ROLES.ADMIN) {
        const currentAdmin = await User.findOne({
          where: { system_role: ROLES.ADMIN, is_active: true },
          transaction,
        });

        if (currentAdmin) {
          // Demote existing admin to STAFF so we maintain "Single Admin" rule
          currentAdmin.system_role = ROLES.STAFF;
          await currentAdmin.save({ transaction });
        }
      }

      // ---------------------------------------------------------
      // 2. DESIGNATION & SEAT SWAP LOGIC
      // ---------------------------------------------------------
      let newDesignation = null;

      // Check if designation is changing
      if (data.designationId && data.designationId !== user.designation_id) {
        // A. Validate & Fetch New Designation (Once)
        newDesignation = await Designation.findByPk(data.designationId, {
          transaction,
        });
        if (!newDesignation) throw new AppError("Designation not found", 404);

        // B. Identify the Target Seat (Department)
        const targetDeptId = data.departmentId || user.department_id;

        // C. Skip Seat Check for "Multi-User" Roles (Member, Clerk)
        const multiUserDesignations = [DESIGNATIONS.MEMBER, DESIGNATIONS.CLERK];

        if (!multiUserDesignations.includes(newDesignation.name)) {
          // D. Find if someone else currently holds this seat
          const existingHolder = await User.findOne({
            where: {
              designation_id: newDesignation.id,
              department_id: targetDeptId,
              id: { [Op.ne]: userId }, // Not the current user
              is_active: true,
            },
            transaction,
          });

          // E. Auto-Demote the existing holder to "MEMBER"
          if (existingHolder) {
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
            // Note: We keep their Role & Department same, just strip the title.
            await existingHolder.save({ transaction });
          }
        }
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
        const dept = await Department.findByPk(data.departmentId, {
          transaction,
        });
        if (!dept) throw new AppError("Department not found", 404);
      }

      if (data.designationId && !isDesignationChanging) {
        const desig = await Designation.findByPk(data.designationId, {
          transaction,
        });
        if (!desig) throw new AppError("Designation not found", 404);
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

  async getAllUsers(currentUserId, searchQuery = null) {
    const whereClause = {
      id: { [Op.ne]: currentUserId },
      is_active: true,
    };

    if (searchQuery) {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${searchQuery}%` } },
        { "$designation.name$": { [Op.like]: `%${searchQuery}%` } },
      ];
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ["id", "full_name", "email", "system_role", "is_active"],
      include: [
        {
          model: Designation,
          as: "designation",
          attributes: ["name"],
        },
        {
          model: Department,
          as: "department",
          attributes: ["name"],
        },
      ],
      order: [["full_name", "ASC"]],
      subQuery: false,
    });

    return users;
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
