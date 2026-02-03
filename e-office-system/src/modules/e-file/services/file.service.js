import path from "path";
import {
  sequelize,
  FileMaster,
  FileMovement,
  FileAttachment,
  User,
  Department,
} from "../../../database/models/index.js"; // Import Department
import { FILE_STATUS, ROLES } from "../../../config/constants.js";
import { minioClient, BUCKET_NAME } from "../../../config/minio.js";
import AppError from "../../../utils/AppError.js";
import FileResponseDto from "../dtos/response/FileResponseDto.js"; // Import DTO
import { Op } from "sequelize";

class FileService {
  async createFile(fileData, user, pucFile, attachments) {
    if (user?.system_role === ROLES.ADMIN) {
      throw new AppError("Admins are not allowed to create files.", 403);
    }

    const transaction = await sequelize.transaction(); // START TRANSACTION

    try {
      const year = new Date().getFullYear();

      // 1. Get Department Data
      const department = await Department.findByPk(user.department_id);
      const deptCode = department.name.substring(0, 3).toUpperCase();

      // 2. Generate Running Number
      const count = await FileMaster.count({
        where: { department_id: user.department_id },
        transaction, // Pass transaction to ensure accuracy
      });
      const runningNo = String(count + 1).padStart(3, "0");

      // 3. Generate File Number: MMD/DEPT/001/2026
      const fileNumber = `MMD/${deptCode}/${runningNo}/${year}`;

      // --- STEP 4: UPLOAD PUC (MAIN FILE) ---
      const pucTimestamp = Date.now();
      const pucExt = path.extname(pucFile.originalname);
      const pucUniqueSuffix = `${pucTimestamp}-${Math.round(Math.random() * 1e4)}`;
      const pucObjectName = `files/${year}/${deptCode}/${pucUniqueSuffix}${pucExt}`;

      try {
        await minioClient.putObject(BUCKET_NAME, pucObjectName, pucFile.buffer);
      } catch (err) {
        console.error("MinIO PUC Upload Error:", err);
        throw new AppError("Failed to upload Main File to storage", 500);
      }

      // --- STEP 5: SAVE MASTER FILE TO DB ---
      const newFile = await FileMaster.create(
        {
          file_number: fileNumber,
          subject: fileData.subject,
          description: fileData.description,
          priority: fileData.priority,
          type: fileData.type,
          status: FILE_STATUS.DRAFT,

          puc_url: pucObjectName,
          original_filename: pucFile.originalname,
          mime_type: pucFile.mimetype,

          created_by: user.id,
          current_holder_id: user.id,
          department_id: user.department_id,
        },
        { transaction },
      );

      // --- STEP 6: PROCESS ATTACHMENTS (NEW!) ---
      if (attachments && attachments.length > 0) {
        await Promise.all(
          attachments.map(async (file) => {
            // A. Generate MinIO Path
            const attExt = path.extname(file.originalname);
            const attSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
            const attObjectName = `files/${year}/${deptCode}/attachments/${attSuffix}${attExt}`;

            // B. Upload
            await minioClient.putObject(
              BUCKET_NAME,
              attObjectName,
              file.buffer,
            );

            // C. Save to DB
            return FileAttachment.create(
              {
                file_id: newFile.id,
                original_name: file.originalname,
                file_key: attObjectName,
                file_url: attObjectName,
                mime_type: file.mimetype,
                file_size: file.size,
              },
              { transaction },
            );
          }),
        );
      }

      // --- STEP 7: INITIAL HISTORY LOG (CRITICAL ADDITION) ---
      // This ensures the history tab is not empty!
      await FileMovement.create(
        {
          file_id: newFile.id,
          sent_by: user.id,
          sent_to: user.id, // Self-movement
          action: "CREATED", // Or use specific constant like MOVEMENT_ACTIONS.CREATED
          remarks: "File Initiated / Draft Created",
          is_read: true,
        },
        { transaction },
      );

      // 8. Commit Transaction
      await transaction.commit();

      // 9. Return Response
      await newFile.reload({
        include: [
          { model: Department, as: "department" },
          { model: User, as: "creator" },
          { model: FileAttachment, as: "attachments" }, // Include attachments in response
        ],
      });

      return new FileResponseDto(newFile);
    } catch (error) {
      await transaction.rollback(); // Undo DB changes if MinIO or anything else fails
      throw error;
    }
  }

  async getInbox(userId) {
    // Fetch files where I am the current holder
    const files = await FileMaster.findAll({
      where: {
        current_holder_id: userId,
        // Optional: Filter out 'ARCHIVED' or 'CLOSED' if you want
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["full_name", "designation"], // Who started this?
        },
        {
          model: Department,
          as: "department",
          attributes: ["name"], // Which dept?
        },
      ],
      order: [["updatedAt", "DESC"]], // Newest on top
    });

    // Convert to DTOs (to format Dates to IST)
    return files.map((file) => new FileResponseDto(file));
  }

  async getOutbox(userId) {
    // Logic: Files I created OR files I worked on, BUT I don't hold them right now.
    // For V1, let's keep it simple: "Files I Created" that are NOT with me.

    const files = await FileMaster.findAll({
      where: {
        created_by: userId,
        current_holder_id: { [Op.ne]: userId }, // Op.ne means "Not Equal"
      },
      include: [
        {
          model: User,
          as: "currentHolder", // So I can see "Oh, Suresh has it now"
          attributes: ["full_name", "designation"],
        },
        {
          model: Department,
          as: "department",
          attributes: ["name"],
        },
        {
          model: User,
          as: "creator",
          attributes: ["full_name"],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    return files.map((file) => new FileResponseDto(file));
  }

  async getFileHistory(fileId) {
    // 1. Fetch File Details
    const file = await FileMaster.findByPk(fileId, {
      include: [
        { model: Department, as: "department", attributes: ["name"] },
        { model: User, as: "creator", attributes: ["full_name"] },
        {
          model: User,
          as: "currentHolder",
          attributes: ["full_name", "designation"],
        },
        { model: FileAttachment, as: "attachments" },
      ],
    });

    if (!file) {
      throw new AppError("File not found", 404);
    }

    // 2. Fetch Movements (The Audit Trail)
    const movements = await FileMovement.findAll({
      where: { file_id: fileId },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["full_name", "designation"],
        },
        {
          model: User,
          as: "receiver",
          attributes: ["full_name", "designation"],
        },
      ],
      order: [["createdAt", "ASC"]], // Oldest first (Chronological order)
    });

    // 3. Return Combined Data
    // We will format the movements nicely here or in a DTO
    return {
      file: new FileResponseDto(file),
      history: movements.map((move) => ({
        id: move.id,
        action: move.action,
        remarks: move.remarks,
        from: move.sender.full_name,
        to: move.receiver.full_name,
        date: new Date(move.createdAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
      })),
    };
  }

  async searchFiles(queryFilters) {
    // 1. Initialize the WHERE clause
    const whereClause = {};

    // 2. Text Search (Subject OR File Number)
    if (queryFilters.text) {
      whereClause[Op.or] = [
        { subject: { [Op.like]: `%${queryFilters.text}%` } }, // Contains text
        { file_number: { [Op.like]: `%${queryFilters.text}%` } }, // Contains text
      ];
    }

    // 3. Exact Filters
    if (queryFilters.status) {
      whereClause.status = queryFilters.status;
    }

    if (queryFilters.priority) {
      whereClause.priority = queryFilters.priority;
    }

    if (queryFilters.departmentId) {
      whereClause.department_id = queryFilters.departmentId;
    }

    // 4. Execute Query
    const files = await FileMaster.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "currentHolder",
          attributes: ["full_name", "designation"],
        },
        {
          model: Department,
          as: "department",
          attributes: ["name"],
        },
      ],
      order: [["updatedAt", "DESC"]], // Newest first
    });

    return files.map((file) => new FileResponseDto(file));
  }

  async getDashboardStats(userId) {
    // 1. Count Pending (Inbox)
    const pendingCount = await FileMaster.count({
      where: { current_holder_id: userId },
    });

    // 2. Count Created (Total I started)
    const createdCount = await FileMaster.count({
      where: { created_by: userId },
    });

    // 3. Count Approved (My success rate)
    const approvedCount = await FileMaster.count({
      where: {
        created_by: userId,
        status: FILE_STATUS.APPROVED,
      },
    });

    // 4. Count Rejected
    const rejectedCount = await FileMaster.count({
      where: {
        created_by: userId,
        status: FILE_STATUS.REJECTED,
      },
    });

    return {
      pending: pendingCount,
      created: createdCount,
      approved: approvedCount,
      rejected: rejectedCount,
    };
  }
}

export default new FileService();
