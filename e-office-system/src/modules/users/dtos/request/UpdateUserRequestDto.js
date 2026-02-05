import Joi from "joi";
import { ROLES } from "../../../../config/constants.js";
import AppError from "../../../../utils/AppError.js";

class UpdateUserRequestDto {
  static schema = Joi.object({
    fullName: Joi.string().min(3).max(50).optional(),

    // 🚨 CRITICAL: Phone number updates are strictly forbidden
    phoneNumber: Joi.any().forbidden().messages({
      "any.unknown": "Phone Number cannot be edited.",
    }),

    email: Joi.string().email().optional().allow(null, ""),

    password: Joi.string()
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])(?!.*\s).{8,16}$/,
      )
      .optional()
      .messages({
        "string.pattern.base":
          "Password must be 8-16 chars, include uppercase, lowercase, number, and special char.",
      }),

    systemRole: Joi.string()
      .valid(...Object.values(ROLES))
      .optional(),

    designationId: Joi.number().integer().optional(),
    departmentId: Joi.number().integer().optional(),

    isActive: Joi.boolean().optional(),
  });

  static validate(data) {
    const { error, value } = UpdateUserRequestDto.schema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      throw new AppError(error.details.map((d) => d.message).join(", "), 400);
    }
    return value;
  }
}

export default UpdateUserRequestDto;
