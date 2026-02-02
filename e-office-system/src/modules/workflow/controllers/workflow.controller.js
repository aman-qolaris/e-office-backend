import WorkflowService from "../services/workflow.service.js";
import MoveFileRequestDto from "../dtos/request/MoveFileRequestDto.js";

class WorkflowController {
  async moveFile(req, res, next) {
    try {
      const { id } = req.params; // File ID from URL
      const moveData = MoveFileRequestDto.validate(req.body);

      const result = await WorkflowService.moveFile(id, moveData, req.user);

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
