import FileService from "../services/file.service.js";
import CreateFileRequestDto from "../dtos/request/CreateFileRequestDto.js";
import AppError from "../../../utils/AppError.js";

class FileController {
  async createFile(req, res, next) {
    try {
      // 1. Check if file is present
      if (!req.file) {
        throw new AppError("PUC Document (PDF/Image) is required", 400);
      }

      // 2. Validate Text Data
      const fileData = CreateFileRequestDto.validate(req.body);

      // 3. Call Service
      // We pass: Data, User (from token), File Buffer, and Original Name
      const newFile = await FileService.createFile(
        fileData,
        req.user,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );

      // 4. Response
      res.status(201).json({
        success: true,
        message: "e-File created successfully",
        data: newFile,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FileController();
