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

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError("User not found", 404);

    // 1. Verify Current Password
    const isMatch = await user.validatePassword(currentPassword);
    if (!isMatch) {
      throw new AppError("Current password is incorrect", 401);
    }

    // 2. Update Password (Hook will hash it automatically)
    user.password = newPassword;
    await user.save();

    return { message: "Password changed successfully" };
  }

  async setPin(userId, { password, newPin }) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // 1. Verify Password (2FA Step)
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new AppError("Invalid password. Cannot set PIN.", 401);
    }

    // 2. Check if New PIN is same as Old PIN
    // validatePin compares plain text against the hash
    const isSameAsOld = await user.validatePin(newPin);
    if (isSameAsOld) {
      throw new AppError(
        "New PIN cannot be the same as the previous one.",
        400,
      );
    }

    // 2. Save PIN (The Model Hook will auto-hash this!)
    user.security_pin = newPin;
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
