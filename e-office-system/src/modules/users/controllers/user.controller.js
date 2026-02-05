import UserService from "../services/user.service.js";
import CreateUserRequestDto from "../dtos/request/CreateUserRequestDto.js";

class UserController {
  async createUser(req, res, next) {
    try {
      // 1. Validate Input
      const userData = CreateUserRequestDto.validate(req.body);

      // 2. Call Service
      const createdUser = await UserService.createUser(userData);

      // 3. Send Response
      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: createdUser,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      // Pass the current user's ID so we can exclude them from the list
      const users = await UserService.getAllUsers(req.user.id);

      res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllDepartments(req, res, next) {
    try {
      const departments = await UserService.getAllDepartments();

      res.status(200).json({
        success: true,
        message: "Departments fetched successfully",
        data: departments,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllDesignations(req, res, next) {
    try {
      const designations = await UserService.getAllDesignations();

      res.status(200).json({
        success: true,
        message: "Designations fetched successfully",
        count: designations.length,
        data: designations,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
