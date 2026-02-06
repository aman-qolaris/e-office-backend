import path from "path";
import {
  sequelize,
  FileMaster,
  FileMovement,
  FileAttachment,
  User,
  Department,
  Designation, // Ensure Designation is imported
} from "../../../database/models/index.js";
import { FILE_STATUS, ROLES } from "../../../config/constants.js";
import { minioClient, BUCKET_NAME } from "../../../config/minio.js";
import AppError from "../../../utils/AppError.js";
import FileResponseDto from "../dtos/response/FileResponseDto.js";
import { Op } from "sequelize";

class FileService {
  async createFile(fileData, user, pucFile, attachments) {
    if (user?.system_role === ROLES.ADMIN) {
      throw new AppError("Admins are not allowed to create files.", 403);
    }

    const transaction = await sequelize.transaction();

    try {
      const year = new Date().getFullYear();
      const department = await Department.findByPk(user.department_id);
      const deptCode = department.name.substring(0, 3).toUpperCase();

      const count = await FileMaster.count({
        where: { department_id: user.department_id },
        transaction,
      });
      const runningNo = String(count + 1).padStart(3, "0");
      const fileNumber = `MMD/${deptCode}/${runningNo}/${year}`;

      // Upload PUC
      const pucTimestamp = Date.now();
      const pucExt = path.extname(pucFile.originalname);
      const pucUniqueSuffix = `${pucTimestamp}-${Math.round(Math.random() * 1e4)}`;
      const pucObjectName = `files/${year}/${deptCode}/${pucUniqueSuffix}${pucExt}`;

      await minioClient.putObject(BUCKET_NAME, pucObjectName, pucFile.buffer);

      // Save File
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
          department_id: user.department_id,

          // 🚨 Position-Based Fields
          current_holder_id: user.id,
          current_designation_id: user.designation_id,
          current_department_id: user.department_id,
        },
        { transaction },
      );

      // Save Attachments
      if (attachments && attachments.length > 0) {
        await Promise.all(
          attachments.map(async (file) => {
            const attExt = path.extname(file.originalname);
            const attSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
            const attObjectName = `files/${year}/${deptCode}/attachments/${attSuffix}${attExt}`;

            await minioClient.putObject(
              BUCKET_NAME,
              attObjectName,
              file.buffer,
            );

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

      // Initial Movement Log
      await FileMovement.create(
        {
          file_id: newFile.id,
          sent_by: user.id,
          sent_to: user.id,
          action: "CREATED",
          remarks: "File Initiated / Draft Created",
          is_read: true,
        },
        { transaction },
      );

      await transaction.commit();

      await newFile.reload({
        include: [
          { model: Department, as: "department" },
          { model: User, as: "creator" },
          { model: FileAttachment, as: "attachments" },
          // 🚨 ADDED: Include Position Details so DTO works immediately
          { model: Designation, as: "currentDesignation" },
          { model: Department, as: "currentDepartment" },
        ],
      });

      return new FileResponseDto(newFile);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getInbox(user) {
    const files = await FileMaster.findAll({
      where: {
        // ✅ CORRECT: Filtering by Position
        current_designation_id: user.designation_id,
        current_department_id: user.department_id,
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["full_name"],
          include: [
            { model: Designation, as: "designation", attributes: ["name"] },
          ],
        },
        { model: Department, as: "department", attributes: ["name"] },
        // 🚨 ADDED: Must include these so DTO knows the current location
        { model: Designation, as: "currentDesignation", attributes: ["name"] },
        { model: Department, as: "currentDepartment", attributes: ["name"] },
      ],
      order: [["updatedAt", "DESC"]],
    });

    return files.map((file) => new FileResponseDto(file));
  }

  async getOutbox(user) {
    const files = await FileMaster.findAll({
      where: {
        created_by: user.id,
        department_id: user.department_id,
        // ✅ CORRECT: Using Position Logic (Not in my inbox position)
        [Op.or]: [
          { current_designation_id: { [Op.ne]: user.designation_id } },
          { current_department_id: { [Op.ne]: user.department_id } },
        ],
      },
      include: [
        {
          model: User,
          as: "currentHolder",
          attributes: ["full_name"],
        },
        // 🚨 ADDED: Crucial for Outbox to see "Where is my file now?"
        { model: Designation, as: "currentDesignation", attributes: ["name"] },
        { model: Department, as: "currentDepartment", attributes: ["name"] },
        {
          model: User,
          as: "creator",
          attributes: ["full_name"],
        },
        { model: Department, as: "department", attributes: ["name"] },
      ],
      order: [["updatedAt", "DESC"]],
    });

    return files.map((file) => new FileResponseDto(file));
  }

  async getFileHistory(fileId) {
    const file = await FileMaster.findByPk(fileId, {
      include: [
        { model: Department, as: "department", attributes: ["name"] },
        { model: User, as: "creator", attributes: ["full_name"] },
        { model: User, as: "currentHolder", attributes: ["full_name"] },
        // 🚨 ADDED: Includes for consistency
        { model: Designation, as: "currentDesignation", attributes: ["name"] },
        { model: Department, as: "currentDepartment", attributes: ["name"] },
        { model: FileAttachment, as: "attachments" },
      ],
    });

    if (!file) {
      throw new AppError("File not found", 404);
    }

    const movements = await FileMovement.findAll({
      where: { file_id: fileId },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["full_name"],
          include: [
            { model: Designation, as: "designation", attributes: ["name"] },
          ],
        },
        {
          model: User,
          as: "receiver",
          attributes: ["full_name"],
          include: [
            { model: Designation, as: "designation", attributes: ["name"] },
          ],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    return {
      file: new FileResponseDto(file),
      history: movements.map((move) => ({
        id: move.id,
        action: move.action,
        remarks: move.remarks,
        from: move.sender ? move.sender.full_name : "System",
        to: move.receiver ? move.receiver.full_name : "System",
        senderDesignation: move.sender?.designation?.name, // Helpful extra info
        receiverDesignation: move.receiver?.designation?.name,
        date: new Date(move.createdAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
      })),
    };
  }

  async searchFiles(query, user) {
    // Changed arg name to 'query' to match usage
    const { text, status, priority, departmentId } = query;
    const whereClause = {
      // 🚨 SECURITY: Force User's Department (unless you are implementing Global Admin Search later)
      department_id: user.department_id,
    };

    if (text) {
      whereClause[Op.or] = [
        { subject: { [Op.like]: `%${text}%` } },
        { file_number: { [Op.like]: `%${text}%` } },
      ];
    }

    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;

    // Note: We ignore query.departmentId here to enforce the security rule above.

    const files = await FileMaster.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "currentHolder",
          attributes: ["full_name"],
        },
        // 🚨 ADDED Includes
        { model: Designation, as: "currentDesignation", attributes: ["name"] },
        { model: Department, as: "currentDepartment", attributes: ["name"] },
        { model: Department, as: "department", attributes: ["name"] },
      ],
      order: [["updatedAt", "DESC"]],
    });

    return files.map((file) => new FileResponseDto(file));
  }

  async getDashboardStats(user) {
    // Changed arg to 'user' object, not just userId
    // 🚨 CORRECTED: Count based on POSITION
    const pendingCount = await FileMaster.count({
      where: {
        current_designation_id: user.designation_id,
        current_department_id: user.department_id,
      },
    });

    const createdCount = await FileMaster.count({
      where: { created_by: user.id },
    });

    const approvedCount = await FileMaster.count({
      where: {
        created_by: user.id,
        status: FILE_STATUS.APPROVED,
      },
    });

    const rejectedCount = await FileMaster.count({
      where: {
        created_by: user.id,
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
