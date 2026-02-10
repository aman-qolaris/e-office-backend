import { Op } from "sequelize";
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
import { FILE_STATUS, ROLES, DESIGNATIONS } from "../../../config/constants.js";
import { minioClient, BUCKET_NAME } from "../../../config/minio.js";
import AppError from "../../../utils/AppError.js";
import FileResponseDto from "../dtos/response/FileResponseDto.js";


class FileService {
  async createFile(fileData, user, pucFile, attachments) {
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

          is_verified: false,
          verified_by: null,
          verified_at: null,
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
          { model: Designation, as: "currentDesignation" },
          { model: Department, as: "currentDepartment" },
          { model: User, as: "currentHolder" },
        ],
      });

      return new FileResponseDto(newFile);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async addAttachment(fileId, files, currentUser) {
    const fileMaster = await FileMaster.findByPk(fileId);
    if (!fileMaster) throw new AppError("File not found", 404);

    // Permission Check
    if (fileMaster.current_holder_id !== currentUser.id) {
      throw new AppError(
        "You can only add attachments to files you hold.",
        403,
      );
    }

    if (!Array.isArray(files) || files.length === 0) {
      throw new AppError("At least one attachment file is required.", 400);
    }

    const year = new Date().getFullYear();

    const createdAttachments = [];
    for (const file of files) {
      const attExt = path.extname(file.originalname);
      const attSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
      const attObjectName = `files/${year}/attachments/${attSuffix}${attExt}`;

      await minioClient.putObject(BUCKET_NAME, attObjectName, file.buffer);

      const newAttachment = await FileAttachment.create({
        file_id: fileMaster.id,
        original_name: file.originalname,
        file_key: attObjectName,
        file_url: attObjectName,
        mime_type: file.mimetype,
        file_size: file.size,
      });

      createdAttachments.push(newAttachment);
    }

    return createdAttachments;
  }

  async removeAttachment(attachmentId, currentUser) {
    const attachment = await FileAttachment.findByPk(attachmentId, {
      include: [{ model: FileMaster, as: "masterFile" }],
    });

    if (!attachment) throw new AppError("Attachment not found", 404);

    // Permission Check
    if (attachment.masterFile.current_holder_id !== currentUser.id) {
      throw new AppError(
        "You can only remove attachments from files you hold.",
        403,
      );
    }

    await attachment.destroy();

    return { message: "Attachment removed successfully" };
  }

// ... existing imports
async getInbox(user) {
    try {
      const files = await FileMaster.findAll({
        where: {
          current_designation_id: user.designation_id,
          current_department_id: user.department_id,
         [Op.or]: [
            { status: { [Op.ne]: 'CLOSED' } }, // Status is 'DRAFT' or 'PENDING'
            { status: { [Op.is]: null } }      // OR Status is NULL
          ]
        },
        include: [
          { model: User, as: "creator", attributes: ["full_name"] },
          { model: Department, as: "department", attributes: ["name"] },
          { model: Designation, as: "currentDesignation", attributes: ["name"] },
          { model: Department, as: "currentDepartment", attributes: ["name"] },
          { model: User, as: "currentHolder", attributes: ["full_name"] },
          { model: FileAttachment, as: "attachments" },
          
          { 
              model: FileMovement, 
              as: "movements",
              limit: 1,
              where: {
                  action: { 
                      [Op.in]: ['FORWARD', 'CREATED', 'VERIFY'] 
                  }
              },
              order: [['createdAt', 'DESC']],
              include: [
                  { model: User, as: 'sender', attributes: ["full_name"] } 
              ],
              // 🟢 FIX IS HERE: ADD 'sent_by' TO THIS LIST
              attributes: ['action', 'remarks', 'createdAt', 'sent_by'] 
          }
        ],
        order: [["updatedAt", "DESC"]],
      });

      return files.map((file) => {
          file.latestMovement = file.movements && file.movements.length > 0 ? file.movements[0] : null;
          return new FileResponseDto(file);
      });
      
    } catch (error) {
      console.error("Error in getInbox:", error);
      throw error;
    }
  }


async getOutbox(user) {
    // 1. Identify files I have ever touched/sent
    const movements = await FileMovement.findAll({
      attributes: ["file_id"],
      where: { sent_by: user.id },
      raw: true,
    });

    const sentFileIds = [...new Set(movements.map((m) => m.file_id))];

    if (sentFileIds.length === 0) return [];

    // 2. Fetch Files (NO STATUS CHECK)
    const files = await FileMaster.findAll({
      where: {
        id: { [Op.in]: sentFileIds },
        
        // 🟢 LOGIC: Outbox = Files I sent that are NOT currently with me
        [Op.and]: [
            { current_holder_id: { [Op.ne]: user.id } },
            // Optional: Ensure it's not at my designation either
            { current_designation_id: { [Op.ne]: user.designation_id } }
        ]
      },
      include: [
        { model: User, as: "currentHolder", attributes: ["full_name"] },
        { model: Designation, as: "currentDesignation", attributes: ["name"] },
        
        // 🟢 NEW: Fetch the LATEST movement to get the "Last Remark"
        { 
            model: FileMovement, 
            as: "movements",
            limit: 1,
            order: [['createdAt', 'DESC']],
            attributes: ['action', 'remarks']
        }
      ],
      order: [["updatedAt", "DESC"]],
    });

    // Map manually because Sequelize 'hasMany' with limit is tricky to alias as single object
    // We attach the first movement from the array to a property called 'latestMovement'
    const filesWithRemark = files.map(f => {
        f.latestMovement = f.movements && f.movements.length > 0 ? f.movements[0] : null;
        return new FileResponseDto(f);
    });

    return filesWithRemark;
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
        { model: User, as: "verifier", attributes: ["full_name"] },
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
    const { text, status, priority } = query;
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

    return {
      pending: pendingCount,
      created: createdCount,
    };
  }

  /**
   * Helper: Check Download Permission
   * logic: Allow if User is Creator OR Current Holder OR in the same Department
   */
  _hasDownloadAccess(file, user) {
    const isCreator = file.created_by === user.id;

    // Position-based check for Holder
    const isHolder =
      file.current_designation_id === user.designation_id &&
      file.current_department_id === user.department_id;

    // Department check (Public within the department)
    const isSameDept = file.department_id === user.department_id;

    // Allow if any of these are true
    return isCreator || isHolder || isSameDept;
  }

  /**
   * 1. Download PUC (Main File)
   */
  async downloadPuc(fileId, user) {
    const file = await FileMaster.findByPk(fileId);
    if (!file) throw new AppError("File not found", 404);

    if (!this._hasDownloadAccess(file, user)) {
      throw new AppError(
        "You do not have permission to download this file.",
        403,
      );
    }

    try {
      const stream = await minioClient.getObject(BUCKET_NAME, file.puc_url);
      return {
        stream,
        filename: file.original_filename,
        mimeType: file.mime_type || "application/pdf",
      };
    } catch (err) {
      console.error("MinIO Error:", err);
      throw new AppError("Error retrieving file from storage.", 500);
    }
  }

  /**
   * 2. Download Attachment
   */
  async downloadAttachment(attachmentId, user) {
    const attachment = await FileAttachment.findByPk(attachmentId);
    if (!attachment) throw new AppError("Attachment not found", 404);

    // We need the parent file to check permissions
    const file = await FileMaster.findByPk(attachment.file_id);
    if (!file) throw new AppError("Associated File not found", 404);

    if (!this._hasDownloadAccess(file, user)) {
      throw new AppError(
        "You do not have permission to download this attachment.",
        403,
      );
    }

    try {
      const stream = await minioClient.getObject(
        BUCKET_NAME,
        attachment.file_key,
      );
      return {
        stream,
        filename: attachment.original_name,
        mimeType: attachment.mime_type || "application/pdf",
      };
    } catch (err) {
      console.error("MinIO Error:", err);
      throw new AppError("Error retrieving attachment from storage.", 500);
    }
  }
}

export default new FileService();
