import Joi from "joi";
import AppError from "../../../../utils/AppError.js";

class CreateDepartmentRequestDto {
  static schema = Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({ "any.required": "Department Name is required" }),

    description: Joi.string().max(255).optional().allow(""),
  });

  static validate(data) {
    const { error, value } = CreateDepartmentRequestDto.schema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      throw new AppError(error.details.map((d) => d.message).join(", "), 400);
    }
    return value;
  }
}

export default CreateDepartmentRequestDto;
