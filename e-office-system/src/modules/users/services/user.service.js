import {
  sequelize,
  User,
  Department,
  Designation,
} from "../../../database/models/index.js";
import { Op } from "sequelize";
import UserResponseDto from "../dtos/response/UserResponseDto.js";
import AppError from "../../../utils/AppError.js";

class UserService {
  async createUser(data) {
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

      const oldDesignationId = user.designation_id;
      const isDesignationChanging =
        data.designationId && data.designationId !== user.designation_id;

      if (data.departmentId) {
        const dept = await Department.findByPk(data.departmentId, {
          transaction,
        });
        if (!dept) throw new AppError("Department not found", 404);
      }

      if (data.designationId) {
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

      if (data.password) {
        user.password = data.password;
      }

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

      await user.reload({ include: ["department", "designation"] });
      return new UserResponseDto(user);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getAllUsers(currentUserId) {
    const users = await User.findAll({
      where: {
        id: { [Op.ne]: currentUserId }, // Exclude the person requesting (Self)
        is_active: true, // Only show active staff
      },
      attributes: ["id", "full_name", "email", "system_role"], // Fetch minimal data
      include: [
        {
          model: Designation,
          as: "designation",
          attributes: ["name"], // Important for the Dropdown Label
        },
        {
          model: Department,
          as: "department",
          attributes: ["name"], // Helpful context
        },
      ],
      order: [["full_name", "ASC"]], // Alphabetical order
    });

    return users;
  }

  async getAllDepartments() {
    // Fetch only ID and Name to keep it lightweight for dropdowns
    const departments = await Department.findAll({
      attributes: ["id", "name"],
      where: { is_active: true }, // Optional: Only show active depts
    });
    return departments;
  }

  async getAllDesignations() {
    return await Designation.findAll({
      where: { is_active: true },
      attributes: ["id", "name", "level"],
      order: [["level", "DESC"]], // Show President first
    });
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

    return newDesig;
  }
}

export default new UserService();
