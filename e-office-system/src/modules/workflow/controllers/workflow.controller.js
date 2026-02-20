import WorkflowService from "../services/workflow.service.js";
import MoveFileRequestDto from "../dtos/request/MoveFileRequestDto.js";
import AppError from "../../../utils/AppError.js";
import fs from "fs";

class WorkflowController {
  async moveFile(req, res, next) {
    const attachments = req.files || [];

    try {
      const { id } = req.params; // File ID from URL
      const moveData = MoveFileRequestDto.validate(req.body);

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
      if (attachments.length > 0) {
        attachments.forEach((file) => {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlink(file.path, (err) => {
              if (err)
                console.error("Failed to clean up temp file on error:", err);
            });
          }
        });
      }

      next(error);
    }
  }
}

export default new WorkflowController();
