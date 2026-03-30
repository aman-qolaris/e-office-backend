import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import { User, Designation, Department } from "../database/models/index.js";
import redisClient from "../config/redis.js";

export const protect = async (req, res, next) => {
  try {
    // Get token from cookie or header
    let token;
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError("You are not logged in. Please login to get access.", 401),
      );
    }

    // ✅ REDIS BLACKLIST CHECK
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return next(
        new AppError("Your session has ended. Please log in again.", 401),
      );
    }

    // 2. Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const cacheKey = `user:${decoded.id}`;

    let currentUser = null;

    // A. Check Redis First
    const cachedUser = await redisClient.get(cacheKey);

    if (cachedUser) {
      // Lightning fast! Parse the string back into a JavaScript object
      // Then re-hydrate it into Sequelize model instances so downstream code
      // can safely call instance methods (e.g. validatePassword/save/reload).
      const parsed = JSON.parse(cachedUser);

      currentUser = User.build(parsed, {
        isNewRecord: false,
      });

      if (parsed?.designation) {
        currentUser.designation = Designation.build(parsed.designation, {
          isNewRecord: false,
        });
      }

      if (parsed?.department) {
        currentUser.department = Department.build(parsed.department, {
          isNewRecord: false,
        });
      }
    } else {
      // B. If not in cache, fetch from MySQL
      currentUser = await User.findByPk(decoded.id, {
        include: [
          { model: Designation, as: "designation" },
          { model: Department, as: "department" },
        ],
      });

      if (!currentUser) {
        return next(
          new AppError(
            "The user belonging to this token no longer exists.",
            401,
          ),
        );
      }

      // C. Save to Redis for 1 Hour (3600 seconds)
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(currentUser));
    }

    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(
        new Date(currentUser.passwordChangedAt).getTime() / 1000,
        10,
      );
      if (decoded.iat < changedTimestamp) {
        return next(
          new AppError(
            "User recently changed password! Please log in again.",
            401,
          ),
        );
      }
    }

    // 4. Check if user is active
    if (!currentUser.is_active) {
      return next(new AppError("Your account has been deactivated.", 403));
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError("Invalid or expired token", 401));
  }
};
