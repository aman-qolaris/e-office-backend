import Joi from "joi";
import AppError from "../../../../utils/AppError.js";

class CreateDesignationRequestDto {
  static schema = Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({ "any.required": "Designation Name is required" }),

    // 🚨 UPDATED: Strict validation for levels 10, 50, 100 only
    level: Joi.number().integer().valid(10, 50, 100).required().messages({
      "any.only":
        "Level must be one of: 10 (Staff), 50 (Mid-Level), or 100 (Top-Level)",
      "any.required": "Level is required (10, 50, or 100)",
    }),
  });

  static validate(data) {
    const { error, value } = CreateDesignationRequestDto.schema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      throw new AppError(error.details.map((d) => d.message).join(", "), 400);
    }
    return value;
  }
}

export default CreateDesignationRequestDto;
