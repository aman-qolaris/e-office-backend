import Joi from "joi";

class LoginRequestDto {
  constructor(data) {
    this.phoneNumber = data.phoneNumber;
    this.password = data.password;
  }

  // Strict Validation Schema
  static schema = Joi.object({
    phoneNumber: Joi.string()
      .pattern(/^[6-9]\d{9}$/) // Starts with 6-9, followed by 9 digits
      .required()
      .messages({
        "string.pattern.base":
          "Phone number must be a valid 10-digit Indian number",
        "any.required": "Phone number is required",
      }),

    password: Joi.string().min(8).max(16).required().messages({
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password cannot exceed 16 characters",
      "any.required": "Password is required",
    }),
  });

  // Validate method
  static validate(data) {
    const { error, value } = LoginRequestDto.schema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      throw new Error(error.details.map((d) => d.message).join(", "));
    }
    return value;
  }
}

export default LoginRequestDto;
