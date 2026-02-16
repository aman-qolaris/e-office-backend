import Joi from "joi";
import AppError from "../../../../utils/AppError.js";

class ForgotPasswordRequestDto {
  static schema = Joi.object({
    // Use camelCase to match your CreateUser logic
    phoneNumber: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({
        "string.pattern.base":
          "Invalid Indian Phone Number. Must be 10 digits.",
        "any.required": "Phone number is required",
      }),
  });

  static validate(data) {
    const { error, value } = ForgotPasswordRequestDto.schema.validate(data);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }
    return value;
  }
}

export default ForgotPasswordRequestDto;
