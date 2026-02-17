import path from "path";
import { minioClient, BUCKET_NAME } from "../../../config/minio.js";
import {
  sequelize,
  FileMaster,
  FileMovement,
  FileAttachment,
  User,
  Designation,
  Department,
} from "../../../database/models/index.js";
import {
  MOVEMENT_ACTIONS,
  ROLES,
  DESIGNATIONS,
} from "../../../config/constants.js";
import AppError from "../../../utils/AppError.js";

class WorkflowService {
  async moveFile(fileId, moveData, currentUser, attachments = []) {
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

      if (moveData.action === MOVEMENT_ACTIONS.FORWARD) {
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

        const isPinValid = await currentUser.validatePin(moveData.pin);
        if (!isPinValid) {
          throw new AppError("Invalid Security PIN.", 400);
        }

        file.is_verified = true;
        file.verified_by = currentUser.id;
        file.verified_at = new Date();
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

      file.current_holder_id = moveData.receiverId; // Keep for reference
      file.current_designation_id = receiver.designation_id; // CRITICAL
      file.current_department_id = receiver.department_id; // CRITICAL
      file.status = null;

      await file.save({ transaction });

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
        },
        { transaction },
      );

      if (attachments && attachments.length > 0) {
        const department = await Department.findByPk(currentUser.department_id);
        const deptCode = department.name.substring(0, 3).toUpperCase();
        const year = new Date().getFullYear();

        await Promise.all(
          attachments.map(async (uploadFile) => {
            const attExt = path.extname(uploadFile.originalname);
            const attSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
            // Notice we put it in a specific movement folder
            const attObjectName = `files/${year}/${deptCode}/movements/${movement.id}/${attSuffix}${attExt}`;

            await minioClient.putObject(
              BUCKET_NAME,
              attObjectName,
              uploadFile.buffer,
            );

            return FileAttachment.create(
              {
                file_id: file.id,
                movement_id: movement.id,
                original_name: uploadFile.originalname,
                file_key: attObjectName,
                file_url: attObjectName,
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
