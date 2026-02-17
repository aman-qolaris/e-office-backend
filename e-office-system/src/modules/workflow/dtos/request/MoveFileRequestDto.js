import Joi from "joi";
import { MOVEMENT_ACTIONS } from "../../../../config/constants.js";
import AppError from "../../../../utils/AppError.js";

class MoveFileRequestDto {
  static schema = Joi.object({
    receiverId: Joi.number()
      .integer()
      .when("action", {
        is: MOVEMENT_ACTIONS.VERIFY,
        then: Joi.optional(),
        otherwise: Joi.required(),
      })
      .messages({ "any.required": "Receiver (Target User) is required" }),

    action: Joi.string()
      .valid(...Object.values(MOVEMENT_ACTIONS))
      .default(MOVEMENT_ACTIONS.FORWARD)
      .messages({
        "any.only": "Invalid action. Allowed actions are: FORWARD, VERIFY.",
      }),

    remarks: Joi.string()
      .required()
      .min(3)
      .messages({ "any.required": "Remarks are mandatory for audit purposes" }),

    pin: Joi.string()
      .pattern(/^\d{4}$/)
      .required()
      .messages({ "string.pattern.base": "PIN must be exactly 4 digits" }),
  });

  static validate(data) {
    const { error, value } = MoveFileRequestDto.schema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      const errorMessage = error.details.map((d) => d.message).join(", ");
      throw new AppError(errorMessage, 400);
    }
    return value;
  }
}

export default MoveFileRequestDto;
