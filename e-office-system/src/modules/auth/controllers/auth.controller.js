import AuthService from "../services/auth.service.js";
import LoginRequestDto from "../dtos/request/LoginRequestDto.js";
import ChangePasswordRequestDto from "../dtos/request/ChangePasswordRequestDto.js";
import SetPinRequestDto from "../dtos/request/SetPinRequestDto.js";

class AuthController {
  async login(req, res, next) {
    try {
      const loginData = LoginRequestDto.validate(req.body);
      const authResponse = await AuthService.login(loginData);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: authResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      // req.user.id comes from 'protect' middleware
      const data = ChangePasswordRequestDto.validate(req.body);
      const result = await AuthService.changePassword(req.user.id, data);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async setPin(req, res, next) {
    try {
      const data = SetPinRequestDto.validate(req.body);
      const result = await AuthService.setPin(req.user.id, data);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
