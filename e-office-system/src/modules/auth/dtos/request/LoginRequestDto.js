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
