import Joi from "joi";
import { PRIORITY } from "../../../../config/constants.js";
import AppError from "../../../../utils/AppError.js";

class CreateFileRequestDto {
  static schema = Joi.object({
    subject: Joi.string()
      .min(5)
      .max(255)
      .required()
      .messages({ "any.required": "Subject is required" }),

    priority: Joi.string()
      .valid(...Object.values(PRIORITY))
      .default(PRIORITY.LOW),
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
