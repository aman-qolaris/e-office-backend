import jwt from "jsonwebtoken";
import {
  User,
  Department,
  Designation,
} from "../../../database/models/index.js";
import AuthResponseDto from "../dtos/response/AuthResponseDto.js";
import AppError from "../../../utils/AppError.js";

class AuthService {
  async login(loginDto) {
    // 1. Find User (Include Department info)
    const user = await User.findOne({
      where: { phone_number: loginDto.phoneNumber },
      include: [
        { model: Department, as: "department" },
        { model: Designation, as: "designation" },
      ],
    });

    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    // 2. Validate Password (using the model helper we wrote earlier)
    const isValid = await user.validatePassword(loginDto.password);
    if (!isValid) {
      throw new AppError("Invalid credentials", 401);
    }

    if (!user.is_active) {
      throw new AppError("Account is disabled. Contact Admin.", 403);
    }

    // 3. Generate JWT Token
    const token = this.generateToken(user);

    // 4. Return DTO (Sanitized)
    return new AuthResponseDto(user, token);
  }

  async setPin(userId, pin) {
    // 1. Validation: Must be exactly 4 digits
    // The Validator middleware usually catches this, but this is a safety net
    if (!/^\d{4}$/.test(pin)) {
      throw new AppError("PIN must be exactly 4 digits", 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // 2. Save PIN (The Model Hook will auto-hash this!)
    user.security_pin = pin;
    await user.save();

    return { message: "Security PIN set successfully" };
  }

  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        role: user.system_role,
        designation: user.designation ? user.designation.name : null,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );
  }
}

export default new AuthService();
