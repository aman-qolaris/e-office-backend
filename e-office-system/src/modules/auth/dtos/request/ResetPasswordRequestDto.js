import Joi from "joi";
import AppError from "../../../../utils/AppError.js";

class ResetPasswordRequestDto {
  static schema = Joi.object({
    phoneNumber: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .required(),

    otp: Joi.string()
      .length(6)
      .required()
      .messages({ "string.length": "OTP must be exactly 6 digits" }),

    newPassword: Joi.string()
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])(?!.*\s).{8,16}$/,
      )
      .required()
      .messages({
        "string.pattern.base":
          "Password must be 8-16 characters with uppercase, lowercase, number, and special character.",
      }),
  });

  static validate(data) {
    const { error, value } = ResetPasswordRequestDto.schema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      const errorMessage = error.details.map((d) => d.message).join(", ");
      throw new AppError(errorMessage, 400);
    }
    return value;
  }
}

export default ResetPasswordRequestDto;
