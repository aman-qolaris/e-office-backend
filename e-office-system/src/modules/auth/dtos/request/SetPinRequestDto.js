import Joi from "joi";
import AppError from "../../../../utils/AppError.js";

class SetPinRequestDto {
  static schema = Joi.object({
    password: Joi.string().required().messages({
      "any.required": "Password is required for identity verification.",
    }),
    newPin: Joi.string()
      .pattern(/^\d{4}$/)
      .required()
      .messages({
        "string.pattern.base": "PIN must be exactly 4 digits.",
        "any.required": "New PIN is required.",
      }),
  });

  static validate(data) {
    const { error, value } = SetPinRequestDto.schema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      throw new AppError(error.details.map((d) => d.message).join(", "), 400);
    }
    return value;
  }
}

export default SetPinRequestDto;
