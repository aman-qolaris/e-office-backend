import {
  sequelize,
  FileMaster,
  FileMovement,
} from "../../../database/models/index.js";
import { MOVEMENT_ACTIONS, ROLES } from "../../../config/constants.js";
import AppError from "../../../utils/AppError.js";

class WorkflowService {
  async moveFile(fileId, moveData, currentUser) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Find the File
      const file = await FileMaster.findByPk(fileId);
      if (!file) {
        throw new AppError("File not found", 404);
      }

      // 2. Security Check: Do I actually hold this file?
      if (file.current_holder_id !== currentUser.id) {
        throw new AppError(
          "You do not have permission to move this file. You are not the current holder.",
          403,
        );
      }

      // 3. Role Validation Check
      // If action is APPROVE or REJECT, allow only ADMIN or BOARD_MEMBER
      if (
        moveData.action === MOVEMENT_ACTIONS.APPROVE ||
        moveData.action === MOVEMENT_ACTIONS.REJECT
      ) {
        const allowedRoles = [ROLES.ADMIN, ROLES.BOARD_MEMBER];
        if (!allowedRoles.includes(currentUser.system_role)) {
          throw new AppError(
            `Staff members cannot perform ${moveData.action}. You can only FORWARD or REVERT.`,
            403,
          );
        }
      }

      // 4. Update Current Holder
      file.current_holder_id = moveData.receiverId;

      // Note: If you want to update status based on action (e.g. APPROVE -> APPROVED),
      // add that logic here later. For now, we just move it.

      await file.save({ transaction });

      // 5. Create Audit Trail (History)
      await FileMovement.create(
        {
          file_id: file.id,
          sent_by: currentUser.id,
          sent_to: moveData.receiverId,
          action: moveData.action,
          remarks: moveData.remarks,
          is_read: false,
        },
        { transaction },
      );

      // 6. Commit Transaction
      await transaction.commit();

      return {
        message: "File moved successfully",
        newHolderId: moveData.receiverId,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

export default new WorkflowService();
