import { DataTypes, Model } from "sequelize";
import sequelize from "../../config/database.js";
import { FILE_STATUS, PRIORITY } from "../../config/constants.js";

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
    priority: {
      type: DataTypes.ENUM(...Object.values(PRIORITY)),
      defaultValue: PRIORITY.LOW,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(FILE_STATUS)),
      defaultValue: FILE_STATUS.DRAFT,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // --- POSITION BASED ACCESS FIELDS ---
    current_holder_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Made nullable as files belong to position now
    },
    current_designation_id: {
      type: DataTypes.INTEGER,
      allowNull: false, // CRITICAL: Files must belong to a designation
    },
    current_department_id: {
      type: DataTypes.INTEGER,
      allowNull: false, // CRITICAL: Files must belong to a department
    },
    // ------------------------------------

    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false, // The Origin Department
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Must be true before Forwarding (for Board/President)",
    },

    verified_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "User ID of the person who verified this file",
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Timestamp when verification happened",
    },

    signed_doc_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Path to the President's signed PDF",
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
