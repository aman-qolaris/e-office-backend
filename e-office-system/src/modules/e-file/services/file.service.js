import path from "path";
import {
  FileMaster,
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
}

export default new FileService();
