import { Op } from "sequelize";
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

const encodeCursor = (data) => {
  return Buffer.from(JSON.stringify(data)).toString("base64");
};

const decodeCursor = (cursor) => {
  try {
    return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
  } catch (e) {
    return null;
  }
};

class FileService {
  async createFile(fileData, user) {
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

      // Save File
      const newFile = await FileMaster.create(
        {
          file_number: fileNumber,
          subject: fileData.subject,
          priority: fileData.priority,
          status: FILE_STATUS.DRAFT,

          created_by: user.id,
          department_id: user.department_id,

          // 🚨 Position-Based Fields (Creator is the initial holder)
          current_holder_id: user.id,
          current_designation_id: user.designation_id,
          current_department_id: user.department_id,

          is_verified: false,
          verified_by: null,
          verified_at: null,
        },
        { transaction },
      );

      // Initial Movement Log
      await FileMovement.create(
        {
          file_id: newFile.id,
          sent_by: user.id,
          sent_by_designation_id: user.designation_id,
          sent_by_department_id: user.department_id,
          sent_to: user.id,
          action: "CREATED",
          remarks: "File Initiated / Draft Created",
          is_read: true,
        },
        { transaction },
      );

      // 🟢 The rogue update block used to be here. It is now gone!

      await transaction.commit();

      await newFile.reload({
        include: [
          { model: Department, as: "department" },
          { model: User, as: "creator" },
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

  async getDrafts(user, { limit = 10, cursor = null } = {}) {
    const limitNum = parseInt(limit) || 10;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const whereClause = {
      current_holder_id: user.id,
      status: FILE_STATUS.DRAFT, // Strictly only drafts
    };

    if (decodedCursor) {
      whereClause[Op.and] = [
        {
          [Op.or]: [
            { updatedAt: { [Op.lt]: decodedCursor.updatedAt } },
            {
              updatedAt: decodedCursor.updatedAt,
              id: { [Op.lt]: decodedCursor.id },
            },
          ],
        },
      ];
    }

    const files = await FileMaster.findAll({
      where: whereClause,
      limit: limitNum + 1,
      order: [
        ["updatedAt", "DESC"],
        ["id", "DESC"],
      ],
      include: [
        { model: User, as: "creator", attributes: ["full_name"] },
        { model: Department, as: "department", attributes: ["name"] },
        { model: Designation, as: "currentDesignation", attributes: ["name"] },
        { model: Department, as: "currentDepartment", attributes: ["name"] },
      ],
    });

    let nextCursor = null;
    if (files.length > limitNum) {
      files.pop();
      const lastItem = files[files.length - 1];
      nextCursor = encodeCursor({
        updatedAt: lastItem.updatedAt,
        id: lastItem.id,
      });
    }

    const data = files.map((file) => new FileResponseDto(file));
    return { data, nextCursor };
  }

  // ... existing imports
  async getInbox(user, { limit = 10, cursor = null } = {}) {
    try {
      const limitNum = parseInt(limit) || 10;
      const decodedCursor = cursor ? decodeCursor(cursor) : null;

      // 🟢 THE FIX: Base Condition now strictly checks 'current_holder_id'
      const whereClause = {
        current_designation_id: user.designation_id,
        current_department_id: user.department_id,
        [Op.and]: [
          {
            [Op.or]: [
              { status: { [Op.ne]: ["CLOSED"] } },
              { status: { [Op.is]: null } },
            ],
          },
        ],
      };

      // Apply Cursor (Pagination Logic)
      if (decodedCursor) {
        whereClause[Op.and].push({
          [Op.or]: [
            { updatedAt: { [Op.lt]: decodedCursor.updatedAt } }, // Older than cursor
            {
              updatedAt: decodedCursor.updatedAt,
              id: { [Op.lt]: decodedCursor.id }, // Tie-breaker: smaller ID
            },
          ],
        });
      }

      const files = await FileMaster.findAll({
        where: whereClause,
        limit: limitNum + 1,
        order: [
          ["updatedAt", "DESC"],
          ["id", "DESC"],
        ],
        include: [
          { model: User, as: "creator", attributes: ["full_name"] },
          { model: Department, as: "department", attributes: ["name"] },
          {
            model: Designation,
            as: "currentDesignation",
            attributes: ["name"],
          },
          { model: Department, as: "currentDepartment", attributes: ["name"] },
          { model: User, as: "currentHolder", attributes: ["full_name"] },
          {
            model: FileMovement,
            as: "movements",
            order: [["id", "DESC"]],
            include: [
              {
                model: User,
                as: "sender",
                attributes: ["full_name", "signature_url"],
                include: [
                  {
                    model: Designation,
                    as: "designation",
                    attributes: ["name"],
                  },
                ],
              },
              {
                model: FileAttachment,
                as: "attachments",
                attributes: [
                  "id",
                  "original_name",
                  "file_url",
                  "mime_type",
                  "file_size",
                ],
              },
            ],
          },
        ],
      });

      let nextCursor = null;
      if (files.length > limitNum) {
        files.pop();
        const lastItem = files[files.length - 1];
        nextCursor = encodeCursor({
          updatedAt: lastItem.updatedAt,
          id: lastItem.id,
        });
      }

      const data = files.map((file) => new FileResponseDto(file));

      return { data, nextCursor };
    } catch (error) {
      console.error("Error in getInbox:", error);
      throw error;
    }
  }
  async getOutbox(user, { limit = 10, cursor = null } = {}) {
    const limitNum = parseInt(limit) || 10;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;
    // 1. Identify files I have ever touched/sent
    const movements = await FileMovement.findAll({
      attributes: ["file_id"],
      where: {
        sent_by_designation_id: user.designation_id,
        sent_by_department_id: user.department_id,
      },
      raw: true,
    });

    const sentFileIds = [...new Set(movements.map((m) => m.file_id))];

    if (sentFileIds.length === 0) return { data: [], nextCursor: null };

    const whereClause = {
      id: { [Op.in]: sentFileIds },
      [Op.and]: [{ current_designation_id: { [Op.ne]: user.designation_id } }],
    };

    // Apply Cursor
    if (decodedCursor) {
      whereClause[Op.and].push({
        [Op.or]: [
          { updatedAt: { [Op.lt]: decodedCursor.updatedAt } },
          {
            updatedAt: decodedCursor.updatedAt,
            id: { [Op.lt]: decodedCursor.id },
          },
        ],
      });
    }

    // 2. Fetch Files (NO STATUS CHECK)
    const files = await FileMaster.findAll({
      where: whereClause,
      limit: limitNum + 1,
      order: [
        ["updatedAt", "DESC"],
        ["id", "DESC"],
      ],
      include: [
        { model: User, as: "currentHolder", attributes: ["full_name"] },
        { model: Designation, as: "currentDesignation", attributes: ["name"] },
        { model: Department, as: "currentDepartment", attributes: ["name"] },
        {
          model: FileMovement,
          as: "movements",
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["full_name", "signature_url"],
              include: [
                { model: Designation, as: "designation", attributes: ["name"] },
              ],
            },
            {
              model: FileAttachment,
              as: "attachments",
              attributes: [
                "id",
                "original_name",
                "file_url",
                "mime_type",
                "file_size",
              ],
            },
          ],
        },
      ],
    });

    let nextCursor = null;
    if (files.length > limitNum) {
      files.pop();
      const lastItem = files[files.length - 1];
      nextCursor = encodeCursor({
        updatedAt: lastItem.updatedAt,
        id: lastItem.id,
      });
    }

    const filesWithRemark = files.map((f) => new FileResponseDto(f));
    return { data: filesWithRemark, nextCursor };
  }

  async getFileHistory(fileId, { limit = 20, cursor = null } = {}) {
    const limitNum = parseInt(limit) || 20;
    const cursorId = cursor ? parseInt(cursor) : 0;

    // 1. Just fetch the basic File info (No movements here!)
    const file = await FileMaster.findByPk(fileId, {
      include: [
        { model: Department, as: "department", attributes: ["name"] },
        { model: User, as: "creator", attributes: ["full_name"] },
        { model: User, as: "currentHolder", attributes: ["full_name"] },
        { model: Designation, as: "currentDesignation", attributes: ["name"] },
        { model: Department, as: "currentDepartment", attributes: ["name"] },
        { model: User, as: "verifier", attributes: ["full_name"] },
      ],
    });

    if (!file) {
      throw new AppError("File not found", 404);
    }

    // 2. Fetch the paginated thread (Movements)
    const movementWhere = { file_id: fileId };
    if (cursorId > 0) {
      movementWhere.id = { [Op.gt]: cursorId }; // Fetch newer movements than cursor
    }

    const movements = await FileMovement.findAll({
      where: movementWhere,
      limit: limitNum + 1,
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["full_name", "signature_url"],
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
        {
          model: FileAttachment,
          as: "attachments",
          attributes: [
            "id",
            "original_name",
            "file_url",
            "mime_type",
            "file_size",
          ],
        },
      ],
      order: [["id", "ASC"]],
    });

    let nextCursor = null;
    if (movements.length > limitNum) {
      movements.pop();
      nextCursor = movements[movements.length - 1].id;
    }

    // 3. Attach and map
    file.movements = movements;
    const formattedData = new FileResponseDto(file);

    return {
      data: {
        fileInfo: {
          id: formattedData.id,
          subject: formattedData.subject,
          fileNumber: formattedData.fileNumber,
          priority: formattedData.priority,
          status: formattedData.status,
          currentHolder: formattedData.currentHolder,
          currentPosition: formattedData.currentPosition,
        },
        history: formattedData.thread,
      },
      nextCursor,
    };
  }

  async searchFiles(query, user) {
    // Changed arg name to 'query' to match usage
    const { text, status, priority, startDate, endDate } = query;
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

    if (startDate && endDate) {
      // If both dates are provided, search between them (append time to include the whole end day)
      whereClause.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(`${endDate}T23:59:59.999Z`),
        ],
      };
    } else if (startDate) {
      // Only start date provided (From this date onwards)
      whereClause.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      // Only end date provided (Up to this date)
      whereClause.createdAt = {
        [Op.lte]: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

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
