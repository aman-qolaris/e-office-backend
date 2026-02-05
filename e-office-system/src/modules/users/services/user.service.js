import {
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
}

export default new UserService();
