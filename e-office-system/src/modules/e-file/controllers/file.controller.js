import FileService from "../services/file.service.js";
import CreateFileRequestDto from "../dtos/request/CreateFileRequestDto.js";
class FileController {
  async createFile(req, res, next) {
    try {
      // 2. Validate Text Data
      const fileData = CreateFileRequestDto.validate(req.body);

      // 3. Call Service
      // We pass: Data, User (from token), File Buffer, and Original Name
      const newFile = await FileService.createFile(fileData, req.user);

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

  async getDrafts(req, res, next) {
    try {
      const { limit, cursor } = req.query;

      const result = await FileService.getDrafts(req.user, { limit, cursor });

      res.status(200).json({
        success: true,
        message: "Drafts fetched successfully",
        count: result.data.length,
        data: result.data,
        nextCursor: result.nextCursor,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInbox(req, res, next) {
    try {
      const { limit, cursor } = req.query;
      // "req.user.id" comes from the 'protect' middleware (the token)
      const result = await FileService.getInbox(req.user, { limit, cursor });

      res.status(200).json({
        success: true,
        message: "Inbox fetched successfully",
        count: result.data.length,
        data: result.data,
        nextCursor: result.nextCursor,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOutbox(req, res, next) {
    try {
      const { limit, cursor } = req.query;

      const result = await FileService.getOutbox(req.user, { limit, cursor });
      res.status(200).json({
        success: true,
        message: "Outbox fetched successfully",
        count: result.data.length,
        data: result.data,
        nextCursor: result.nextCursor,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFileHistory(req, res, next) {
    try {
      const { id } = req.params; // Get file ID from URL
      const { limit, cursor,sort} = req.query;

      const result = await FileService.getFileHistory(id, { limit, cursor, sort });

      res.status(200).json({
        success: true,
        message: "File history fetched successfully",
        data: result.data,
        nextCursor: result.nextCursor,
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
}

export default new FileController();
