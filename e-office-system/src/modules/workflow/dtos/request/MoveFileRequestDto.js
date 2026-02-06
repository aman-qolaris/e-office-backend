import Joi from "joi";
import { MOVEMENT_ACTIONS } from "../../../../config/constants.js";

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
      .default(MOVEMENT_ACTIONS.FORWARD),

    remarks: Joi.string()
      .required()
      .min(3)
      .messages({ "any.required": "Remarks are mandatory for audit purposes" }),

    pin: Joi.string()
      .pattern(/^\d{4}$/)
      .optional() // It is optional because FORWARD doesn't need it
      .messages({ "string.pattern.base": "PIN must be exactly 4 digits" }),
  });

  static validate(data) {
    const { error, value } = MoveFileRequestDto.schema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      throw new Error(error.details.map((d) => d.message).join(", "));
    }
    return value;
  }
}

export default MoveFileRequestDto;
