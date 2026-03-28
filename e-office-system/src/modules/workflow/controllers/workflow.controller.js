import WorkflowService from "../services/workflow.service.js";
import MoveFileRequestDto from "../dtos/request/MoveFileRequestDto.js";
import AppError from "../../../utils/AppError.js";
import { minioClient, BUCKET_NAME } from "../../../config/minio.js";

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
        await Promise.all(
          attachments.map(async (file) => {
            const key = file?.key;
            if (!key) return;
            try {
              await minioClient.removeObject(BUCKET_NAME, key);
            } catch (cleanupErr) {
              console.error(
                "Failed to clean up MinIO object on error:",
                cleanupErr,
              );
            }
          }),
        );
      }

      next(error);
    }
  }
}

export default new WorkflowController();
