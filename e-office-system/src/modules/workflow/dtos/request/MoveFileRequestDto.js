import Joi from "joi";
import { MOVEMENT_ACTIONS } from "../../../../config/constants.js";

class MoveFileRequestDto {
  static schema = Joi.object({
    receiverId: Joi.number()
      .integer()
      .required()
      .messages({ "any.required": "Receiver (Target User) is required" }),

    action: Joi.string()
      .valid(...Object.values(MOVEMENT_ACTIONS))
      .default(MOVEMENT_ACTIONS.FORWARD),

    remarks: Joi.string()
      .required()
      .min(3)
      .messages({ "any.required": "Remarks are mandatory for audit purposes" }),
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
