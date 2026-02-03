import Joi from "joi";
import { ROLES, DESIGNATIONS } from "../../../../config/constants.js";

class CreateUserRequestDto {
  constructor(data) {
    this.fullName = data.fullName;
    this.phoneNumber = data.phoneNumber;
    this.password = data.password;
    this.systemRole = data.systemRole;
    this.designation = data.designation;
    this.departmentId = data.departmentId;
    this.email = data.email;
  }

  static schema = Joi.object({
    fullName: Joi.string().min(3).max(50).required(),

    phoneNumber: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({ "string.pattern.base": "Invalid Indian Phone Number" }),

    password: Joi.string()
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])(?!.*\s).{8,16}$/,
      )
      .required()
      .messages({
        "string.pattern.base":
          "Password must be 8-16 characters and include uppercase, lowercase, number, and special character (no spaces)",
        "any.required": "Password is required",
      }),

    // Must be a valid System Role (ADMIN, STAFF, BOARD_MEMBER)
    systemRole: Joi.string()
      .valid(...Object.values(ROLES))
      .required(),

    // Must be a valid Designation (PRESIDENT, CLERK, etc.)
    designation: Joi.string()
      .valid(...Object.values(DESIGNATIONS))
      .required(),

    departmentId: Joi.number().integer().required(),

    email: Joi.string().email().optional().allow(null, ""),
  });

  static validate(data) {
    const { error, value } = CreateUserRequestDto.schema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      throw new Error(error.details.map((d) => d.message).join(", "));
    }
    return value;
  }
}

export default CreateUserRequestDto;
