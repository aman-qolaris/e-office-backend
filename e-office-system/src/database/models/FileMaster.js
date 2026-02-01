import { DataTypes, Model } from "sequelize";
import sequelize from "../../config/database.js";
import { FILE_STATUS, PRIORITY, FILE_TYPES } from "../../config/constants.js";

class FileMaster extends Model {}

FileMaster.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    file_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // --- UPDATED FILE COLUMNS ---
    puc_url: {
      type: DataTypes.STRING, // The path in MinIO (e.g., files/2026/HLT/xyz.pdf)
      allowNull: false,
    },
    original_filename: {
      type: DataTypes.STRING, // e.g., "budget_estimate.pdf"
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING, // e.g., "application/pdf"
      defaultValue: "application/pdf",
    },
    // ---------------------------

    priority: {
      type: DataTypes.ENUM(...Object.values(PRIORITY)),
      defaultValue: PRIORITY.LOW,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(FILE_TYPES)),
      defaultValue: FILE_TYPES.GENERIC,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(FILE_STATUS)),
      defaultValue: FILE_STATUS.DRAFT,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    current_holder_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "FileMaster",
    tableName: "file_masters",
    timestamps: true,
  },
);

export default FileMaster;
