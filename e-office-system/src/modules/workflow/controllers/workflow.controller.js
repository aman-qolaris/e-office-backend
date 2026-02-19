import WorkflowService from "../services/workflow.service.js";
import MoveFileRequestDto from "../dtos/request/MoveFileRequestDto.js";
import AppError from "../../../utils/AppError.js";

class WorkflowController {
  async moveFile(req, res, next) {
    try {
      const { id } = req.params; // File ID from URL
      const moveData = MoveFileRequestDto.validate(req.body);

      const attachments = req.files || [];
console.log("FILES RECEIVED BY MULTER:", req.files);
      if (attachments.length > 10) {
        throw new AppError(
          "You can only attach a maximum of 10 files at a time.",
          400,
        );
      }

      const nonPdfFiles = attachments.filter(
        (file) => file.mimetype !== "application/pdf",
      );
      if (nonPdfFiles.length > 0) {
        throw new AppError(
          "Invalid file type. Only PDF attachments are allowed.",
          400,
        );
      }

      const result = await WorkflowService.moveFile(
        id,
        moveData,
        req.user,
        attachments,
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new WorkflowController();
