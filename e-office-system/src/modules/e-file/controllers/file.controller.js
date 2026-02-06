import FileService from "../services/file.service.js";
import CreateFileRequestDto from "../dtos/request/CreateFileRequestDto.js";
import AppError from "../../../utils/AppError.js";

class FileController {
  async createFile(req, res, next) {
    try {
      // 1. Check if file is present
      if (!req.files || !req.files["puc"]) {
        throw new AppError("PUC Document (Main PDF) is required", 400);
      }

      const pucFile = req.files["puc"][0]; // The Main File
      const attachmentFiles = req.files["attachments"] || []; // Array of extra files (can be empty)

      // 2. Validate Text Data
      const fileData = CreateFileRequestDto.validate(req.body);

      // 3. Call Service
      // We pass: Data, User (from token), File Buffer, and Original Name
      const newFile = await FileService.createFile(
        fileData,
        req.user,
        pucFile, // Pass the whole PUC object (buffer, name, mime)
        attachmentFiles, // Pass the array of attachments
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

  async uploadSignedDoc(req, res, next) {
    try {
      // Frontend must send field name: 'signed_doc'
      if (!req.file) {
        throw new AppError("Signed Document PDF is required.", 400);
      }

      const { id } = req.params; // File ID
      const result = await FileService.uploadSignedDoc(
        id,
        req.file.buffer, // Buffer from MemoryStorage
        req.user,
      );

      res.status(200).json({
        success: true,
        message: result.message,
        url: result.url,
      });
    } catch (error) {
      next(error);
    }
  }

  async addAttachment(req, res, next) {
    try {
      // Frontend must send field name: 'attachments'
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new AppError("At least one attachment file is required.", 400);
      }

      const { id } = req.params; // File ID
      const attachments = await FileService.addAttachment(
        id,
        req.files,
        req.user,
      );

      res.status(201).json({
        success: true,
        message: "Attachments added successfully",
        data: attachments,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeAttachment(req, res, next) {
    try {
      const { attachmentId } = req.params;
      const result = await FileService.removeAttachment(attachmentId, req.user);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInbox(req, res, next) {
    try {
      // "req.user.id" comes from the 'protect' middleware (the token)
      const files = await FileService.getInbox(req.user);

      res.status(200).json({
        success: true,
        message: "Inbox fetched successfully",
        count: files.length,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOutbox(req, res, next) {
    try {
      const files = await FileService.getOutbox(req.user);
      res.status(200).json({
        success: true,
        message: "Outbox fetched successfully",
        count: files.length,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFileHistory(req, res, next) {
    try {
      const { id } = req.params; // Get file ID from URL
      const history = await FileService.getFileHistory(id);

      res.status(200).json({
        success: true,
        message: "File history fetched successfully",
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  async searchFiles(req, res, next) {
    try {
      // Pass the entire query object (text, status, priority, etc.) to the service
      const files = await FileService.searchFiles(req.query, req.user);

      res.status(200).json({
        success: true,
        message: "Files searched successfully",
        count: files.length,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDashboardStats(req, res, next) {
    try {
      const stats = await FileService.getDashboardStats(req.user);
      res.status(200).json({
        success: true,
        message: "Dashboard stats fetched successfully",
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download PUC (Main File)
   */
  async downloadPuc(req, res, next) {
    try {
      const { id } = req.params;
      const { stream, filename, mimeType } = await FileService.downloadPuc(
        id,
        req.user,
      );

      // Set headers to trigger file download in browser
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Type", mimeType);

      // Pipe the stream directly to the response
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download Attachment
   */
  async downloadAttachment(req, res, next) {
    try {
      const { attachmentId } = req.params;
      const { stream, filename, mimeType } =
        await FileService.downloadAttachment(attachmentId, req.user);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Type", mimeType);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download Signed Document (President's Copy)
   */
  async downloadSignedDoc(req, res, next) {
    try {
      const { id } = req.params;
      const { stream, filename, mimeType } =
        await FileService.downloadSignedDoc(id, req.user);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Type", mimeType);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}

export default new FileController();
