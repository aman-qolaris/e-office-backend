import Joi from "joi";
import { PRIORITY, FILE_TYPES } from "../../../../config/constants.js";
import AppError from "../../../../utils/AppError.js";

class CreateFileRequestDto {
  static schema = Joi.object({
    subject: Joi.string()
      .min(5)
      .max(255)
      .required()
      .messages({ "any.required": "Subject is required" }),

    description: Joi.string().optional().allow(""),

    priority: Joi.string()
      .valid(...Object.values(PRIORITY))
      .default(PRIORITY.LOW),

    type: Joi.string()
      .valid(...Object.values(FILE_TYPES))
      .default(FILE_TYPES.GENERIC),
  });

  static validate(data) {
    const { error, value } = CreateFileRequestDto.schema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      const errorMessage = error.details.map((d) => d.message).join(", ");
      throw new AppError(errorMessage, 400);
    }
    return value;
  }
}

export default CreateFileRequestDto;
