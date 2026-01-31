import AuthService from "../services/auth.service.js";
import LoginRequestDto from "../dtos/request/LoginRequestDto.js";

class AuthController {
  async login(req, res, next) {
    try {
      // 1. Validate & Sanitize Input
      // If validation fails, this throws an error immediately
      const loginData = LoginRequestDto.validate(req.body);

      // 2. Call Business Logic
      const authResponse = await AuthService.login(loginData);

      // 3. Send Success Response
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: authResponse,
      });
    } catch (error) {
      // Pass error to global error handler
      next(error);
    }
  }
}

export default new AuthController();
