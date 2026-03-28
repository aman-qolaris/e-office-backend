import path from "path";
import fileService from "../../e-file/services/file.service.js";
import {
  sequelize,
  FileMovement,
  FileAttachment,
  User,
  Designation,
} from "../../../database/models/index.js";
import {
  MOVEMENT_ACTIONS,
  ROLES,
  DESIGNATIONS,
} from "../../../config/constants.js";
import AppError from "../../../utils/AppError.js";
import { getIO } from "../../../config/socket.js";
import bcrypt from "bcryptjs";

class WorkflowService {
  async moveFile(fileId, moveData, currentUser, attachments = []) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Find the File
      const dbUser = await User.findByPk(currentUser.id);
      const file = await fileService.getFileOrThrow(fileId, transaction);

      if (
        file.current_designation_id !== currentUser.designation_id ||
        file.current_department_id !== currentUser.department_id
      ) {
        throw new AppError(
          "You do not have permission to move this file.",
          403,
        );
      }

      if (moveData.action === MOVEMENT_ACTIONS.FORWARD) {
        if (!currentUser.signature_url) {
          throw new AppError(
            "Digital Signature is missing. Please ask Admin to upload your signature before forwarding files.",
            403,
          );
        }
        // Check if user has even created a PIN yet
        if (!currentUser.security_pin) {
          throw new AppError(
            "Security PIN not created. Please set up your PIN in profile settings first.",
            400,
          );
        }

        if (!moveData.pin) {
          throw new AppError(
            "Security PIN is required to forward this file.",
            400,
          );
        }

        const isPinValid = await bcrypt.compare(
          moveData.pin,
          currentUser.security_pin,
        );
        if (!isPinValid) {
          throw new AppError("Invalid Security PIN.", 400);
        }

        await fileService.markFileVerified(fileId, currentUser.id, transaction);

        // Keep in-memory state aligned for subsequent checks in this flow
        file.is_verified = true;
      }

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

      const isSenderPresident =
        currentUser.designation?.name === DESIGNATIONS.PRESIDENT;

      if (isReceiverPresident) {
        if (!file.is_verified) {
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

      await fileService.updateFileLocation(
        fileId,
        moveData.receiverId,
        transaction,
      );

      // 5. Create Audit Trail (History)
      const movement = await FileMovement.create(
        {
          file_id: file.id,
          sent_by: currentUser.id,
          sent_by_designation_id: currentUser.designation_id,
          sent_by_department_id: currentUser.department_id,
          sent_to: moveData.receiverId,
          action: moveData.action,
          remarks: moveData.remarks,
          is_read: false,
          signature_snapshot: currentUser.signature_url,
        },
        { transaction },
      );

      if (attachments && attachments.length > 0) {
        await Promise.all(
          attachments.map(async (uploadFile) => {
            const fileKey = uploadFile?.key;
            if (!fileKey) {
              throw new AppError(
                "Attachment upload failed: missing object key.",
                500,
              );
            }

            const safeExt =
              path.extname(uploadFile.originalname || "") || ".pdf";
            const originalName =
              uploadFile.originalname || `attachment${safeExt}`;

            return await FileAttachment.create(
              {
                file_id: file.id,
                movement_id: movement.id,
                original_name: originalName,
                file_key: fileKey,
                file_url: fileKey,
                mime_type: uploadFile.mimetype,
                file_size: uploadFile.size,
              },
              { transaction },
            );
          }),
        );
      }

      // 6. Commit Transaction
      await transaction.commit();

      // --- 7. FIRE REAL-TIME SOCKET NOTIFICATION ---
      try {
        const io = getIO();
        // Emit to a specific room named after the receiver's ID
        // The frontend will be listening to "new_file_received"
        io.to(`user_${moveData.receiverId}`).emit("new_file_received", {
          message: "A new file has been forwarded to you.",
          fileId: file.id,
          action: moveData.action,
          senderId: currentUser.id,
        });
        console.log(
          `✅ Real-time notification sent to user_${moveData.receiverId}`,
        );
      } catch (socketError) {
        console.error(
          "❌ Socket emission failed (but file was moved):",
          socketError,
        );
        // We catch the error here so that if the socket fails for any reason,
        // it doesn't break the successful file movement response.
      }

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
