import { User, Department } from "../../../database/models/index.js";
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

    // 3. Create User
    // Note: Password hashing is handled by the 'beforeCreate' hook in User model
    const newUser = await User.create({
      full_name: data.fullName,
      phone_number: data.phoneNumber,
      password: data.password, // Raw password, model will hash it
      system_role: data.systemRole,
      designation: data.designation,
      department_id: data.departmentId,
      email: data.email,
      is_active: true,
    });

    // 4. Reload user to get the associated Department data for the response
    await newUser.reload({ include: "department" });

    // 5. Return Sanitized DTO
    return new UserResponseDto(newUser);
  }
}

export default new UserService();
