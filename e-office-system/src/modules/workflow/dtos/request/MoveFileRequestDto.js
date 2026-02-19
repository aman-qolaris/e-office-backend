import Joi from "joi";
import { MOVEMENT_ACTIONS } from "../../../../config/constants.js";
import AppError from "../../../../utils/AppError.js";

class MoveFileRequestDto {
  static schema = Joi.object({
    receiverId: Joi.number()
      .integer()
      .when("action", {
        is: MOVEMENT_ACTIONS.FORWARD,
        then: Joi.required(),
        otherwise: Joi.optional(),
      })
      .messages({ "any.required": "Receiver (Target User) is required to forward the file." }),

    action: Joi.string()
      .valid(...Object.values(MOVEMENT_ACTIONS))
      .default(MOVEMENT_ACTIONS.FORWARD)
      .messages({
        "any.only": "Invalid action. Allowed actions are: FORWARD, VERIFY.",
      }),

    remarks: Joi.string()
      .required()
      .min(3)
      .messages({ "any.required": "Remarks are mandatory for audit purposes." }),

    pin: Joi.string()
      .pattern(/^\d{4}$/)
      .when("action", {
        is: MOVEMENT_ACTIONS.FORWARD,
        then: Joi.required(),
        otherwise: Joi.optional(),
      })
      .messages({ 
        "any.required": "Security PIN is mandatory to forward and verify this file.",
        "string.pattern.base": "PIN must be exactly 4 digits." 
      }),
  });

  static validate(data) {
    const { error, value } = MoveFileRequestDto.schema.validate(data, {
      abortEarly: false,
      stripUnknown: true, 
    });
    
    if (error) {
      const errorMessage = error.details.map((d) => d.message).join(", ");
      throw new AppError(errorMessage, 400);
    }
    return value;
  }
}

export default MoveFileRequestDto;