import AppError from "../utils/AppError.js";

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user is set by the 'protect' middleware above
    if (!roles.includes(req.user.system_role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }
    next();
  };
};
