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
    if (currentUser?.system_role === ROLES.ADMIN) {
      throw new AppError("Admins are not allowed to move files.", 403);
    }

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

      if (moveData.action === MOVEMENT_ACTIONS.VERIFY) {
        // Only Board Members and President can verify
        const verifiers = [ROLES.BOARD_MEMBER]; // President is also a Board Member role in some contexts, or we check designation
        const isPresident =
          currentUser.designation?.name === DESIGNATIONS.PRESIDENT;

        if (!verifiers.includes(currentUser.system_role) && !isPresident) {
          throw new AppError(
            "Only Board Members or President can verify files.",
            403,
          );
        }

        // Special Check: President must upload signed doc before verifying
        if (isPresident && !file.signed_doc_url) {
          throw new AppError(
            "President cannot verify without uploading the Signed Document first.",
            400,
          );
        }

        file.is_verified = true;
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

      // --- RULE 1: Staff cannot send to President ---
      if (currentUser.system_role === ROLES.STAFF && isReceiverPresident) {
        throw new AppError(
          "Hierarchy Violation: Staff cannot send files directly to the President.",
          403,
        );
      }

      // --- RULE 2: Board Member must VERIFY before sending to President ---
      if (
        currentUser.system_role === ROLES.BOARD_MEMBER &&
        isReceiverPresident
      ) {
        if (!file.is_verified) {
          throw new AppError(
            "Verification Required: You must VERIFY this file before forwarding to the President.",
            400,
          );
        }
      }

      // --- RULE 3: President must VERIFY before Approval/Rejection ---
      const isPresident =
        currentUser.designation?.name === DESIGNATIONS.PRESIDENT;

      if (isPresident && moveData.action === MOVEMENT_ACTIONS.FORWARD) {
        if (!file.is_verified) {
          throw new AppError(
            "Verification Required: President must verify (and sign) before this action.",
            400,
          );
        }
      }

      // --- SECURITY PIN CHECK (For Verify/Approve/Reject) ---
      const sensitiveActions = [];

      if (sensitiveActions.includes(moveData.action)) {
        if (!moveData.pin) {
          throw new AppError("Security PIN is required for this action.", 400);
        }
        const isPinValid = await currentUser.validatePin(moveData.pin);
        if (!isPinValid) {
          // 🔴 CRITICAL FIX: Changed from 401 to 400 to prevent auto-logout
          throw new AppError(
            "Invalid Security PIN. Please check and try again.",
            400,
          );
        }
      }

      file.current_holder_id = moveData.receiverId; // Keep for reference
      file.current_designation_id = receiver.designation_id; // CRITICAL
      file.current_department_id = receiver.department_id; // CRITICAL

      file.is_verified = false;

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
