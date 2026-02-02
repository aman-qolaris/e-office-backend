import path from "path";
import {
  FileMaster,
  FileMovement,
  User,
  Department,
} from "../../../database/models/index.js"; // Import Department
import { FILE_STATUS } from "../../../config/constants.js";
import { minioClient, BUCKET_NAME } from "../../../config/minio.js";
import AppError from "../../../utils/AppError.js";
import FileResponseDto from "../dtos/response/FileResponseDto.js"; // Import DTO
import { Op } from "sequelize";

class FileService {
  async createFile(fileData, user, fileBuffer, originalName, mimeType) {
    const year = new Date().getFullYear();

    // 1. Get Department Data to generate Code
    // (We need the department name to make the code e.g. "Health" -> "HEA")
    const department = await Department.findByPk(user.department_id);
    const deptCode = department.name.substring(0, 3).toUpperCase();

    // 2. Generate Running Number (Sequence)
    // Count how many files this department created this year
    // NOTE: In high-traffic apps, this needs a transaction/lock. For now, count is fine.
    const count = await FileMaster.count({
      where: {
        department_id: user.department_id,
      },
    });
    const runningNo = String(count + 1).padStart(3, "0"); // 1 -> "001"

    // 3. Format: MMD/DEPT/001/2026
    const fileNumber = `MMD/${deptCode}/${runningNo}/${year}`;

    // 4. Prepare MinIO Path
    // Format: files/2026/HEA/1738...-budget.pdf
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    const uniqueSuffix = `${timestamp}-${Math.round(Math.random() * 1e4)}`;

    // This is the clean structure you asked for
    const objectName = `files/${year}/${deptCode}/${uniqueSuffix}${extension}`;

    // 5. Upload to MinIO
    try {
      await minioClient.putObject(BUCKET_NAME, objectName, fileBuffer);
    } catch (err) {
      console.error("MinIO Upload Error:", err);
      throw new AppError("Failed to upload file to storage", 500);
    }

    // 6. Save to Database
    const newFile = await FileMaster.create({
      file_number: fileNumber,
      subject: fileData.subject,
      description: fileData.description,
      priority: fileData.priority,
      type: fileData.type,
      status: FILE_STATUS.DRAFT,

      puc_url: objectName,
      original_filename: originalName, // Store original name
      mime_type: mimeType, // Store mime type

      created_by: user.id,
      current_holder_id: user.id,
      department_id: user.department_id,
    });

    // 7. Return Formatted DTO (with IST Time)
    // We reload to get the Department name for the response
    await newFile.reload({ include: ["department", "creator"] });
    return new FileResponseDto(newFile);
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
}

export default new FileService();
