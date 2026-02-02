import {
  sequelize,
  FileMaster,
  FileMovement,
} from "../../../database/models/index.js";
import {
  MOVEMENT_ACTIONS,
  ROLES,
  FILE_STATUS,
} from "../../../config/constants.js";
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

      // --- NEW: AUTO-UPDATE STATUS ---
      let newStatus = file.status;

      switch (moveData.action) {
        case MOVEMENT_ACTIONS.APPROVE:
          newStatus = FILE_STATUS.APPROVED;
          break;
        case MOVEMENT_ACTIONS.REJECT:
          newStatus = FILE_STATUS.REJECTED;
          break;
        case MOVEMENT_ACTIONS.REVERT:
          newStatus = FILE_STATUS.REVERTED;
          break;
        case MOVEMENT_ACTIONS.FORWARD:
          // If it was DRAFT, now it is IN_PROGRESS
          if (file.status === FILE_STATUS.DRAFT) {
            newStatus = FILE_STATUS.IN_PROGRESS;
          }
          // If it was REVERTED, and we fix & forward, it becomes IN_PROGRESS again
          if (file.status === FILE_STATUS.REVERTED) {
            newStatus = FILE_STATUS.IN_PROGRESS;
          }
          break;
      }

      // 4. Update Current Holder
      file.current_holder_id = moveData.receiverId;
      file.status = newStatus;

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
