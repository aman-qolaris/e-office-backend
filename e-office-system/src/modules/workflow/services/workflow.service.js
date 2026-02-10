import {
  sequelize,
  FileMaster,
  FileMovement,
  User,
  Designation,
} from "../../../database/models/index.js";
import {
  MOVEMENT_ACTIONS,
  ROLES,
  DESIGNATIONS,
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

      if (
        file.current_designation_id !== currentUser.designation_id ||
        file.current_department_id !== currentUser.department_id
      ) {
        throw new AppError(
          "You do not have permission to move this file.",
          403,
        );
      }

      // --- SECURITY PIN CHECK (For Verify) ---
      const sensitiveActions = [MOVEMENT_ACTIONS.VERIFY];

      if (sensitiveActions.includes(moveData.action)) {
        if (!moveData.pin) {
          throw new AppError("Security PIN is required for this action.", 400);
        }
        const isPinValid = await currentUser.validatePin(moveData.pin);
        if (!isPinValid) {
          throw new AppError(
            "Invalid Security PIN. Please check and try again.",
            400,
          );
        }
      }

      if (moveData.action === MOVEMENT_ACTIONS.VERIFY) {
        // Only Board Members and President can verify
        const verifiers = [ROLES.BOARD_MEMBER, ROLES.ADMIN]; // President is also a Board Member role in some contexts, or we check designation
        const isPresident =
          currentUser.designation?.name === DESIGNATIONS.PRESIDENT;

        if (!verifiers.includes(currentUser.system_role) && !isPresident) {
          throw new AppError(
            "Only Board Members or President can verify files.",
            403,
          );
        }

        file.is_verified = true;
        file.verified_by = currentUser.id;
        file.verified_at = new Date();

        await file.save({ transaction });

        // Audit Log
        await FileMovement.create(
          {
            file_id: file.id,
            sent_by: currentUser.id,
            sent_to: currentUser.id, // Self
            action: MOVEMENT_ACTIONS.VERIFY,
            remarks: moveData.remarks || "File Verified",
            is_read: true,
          },
          { transaction },
        );

        await transaction.commit();
        return { message: "File verified successfully." };
      }

      // --- NEW: FETCH RECEIVER DETAILS ---
      const receiver = await User.findByPk(moveData.receiverId, {
        include: [{ model: Designation, as: "designation" }],
      });
      if (!receiver) {
        throw new AppError("Receiver not found", 404);
      }

      if (receiver.id === currentUser.id) {
        throw new AppError("You cannot send or move a file to yourself.", 400);
      }

      const isReceiverPresident =
        receiver.designation?.name === DESIGNATIONS.PRESIDENT;
      const isAdmin = currentUser.system_role === ROLES.ADMIN;

      // --- RULE 1: Staff cannot send to President ---
      if (
        currentUser.system_role === ROLES.STAFF &&
        isReceiverPresident &&
        !isAdmin
      ) {
        throw new AppError(
          "Hierarchy Violation: Staff cannot send files directly to the President.",
          403,
        );
      }

      const isBoardMember = currentUser.system_role === ROLES.BOARD_MEMBER;
      const isSenderPresident =
        currentUser.designation?.name === DESIGNATIONS.PRESIDENT;

      if (isReceiverPresident) {
        if ((isBoardMember || isAdmin) && !file.is_verified) {
          throw new AppError(
            "Verification Required: You must VERIFY this file before forwarding to the President.",
            400,
          );
        }
      }

      if (isSenderPresident && !file.is_verified) {
        throw new AppError(
          "Verification Required: President must verify before forwarding.",
          400,
        );
      }

      file.current_holder_id = moveData.receiverId; // Keep for reference
      file.current_designation_id = receiver.designation_id; // CRITICAL
      file.current_department_id = receiver.department_id; // CRITICAL

      file.is_verified = false;
      file.verified_by = null;
      file.verified_at = null;

      file.status = null;

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
