import Joi from "joi";
import AppError from "../../../../utils/AppError.js";

class ChangePasswordRequestDto {
  static schema = Joi.object({
    currentPassword: Joi.string().required().messages({
      "any.required": "Current password is required",
    }),
    newPassword: Joi.string()
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])(?!.*\s).{8,16}$/,
      )
      .required()
      .disallow(Joi.ref("currentPassword"))
      .messages({
        "string.pattern.base":
          "New password must be 8-16 characters and include uppercase, lowercase, number, and special character.",
        "any.invalid":
          "New password cannot be the same as the current password.",
      }),
  });

  static validate(data) {
    const { error, value } = ChangePasswordRequestDto.schema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      throw new AppError(error.details.map((d) => d.message).join(", "), 400);
    }
    return value;
  }
}

export default ChangePasswordRequestDto;
