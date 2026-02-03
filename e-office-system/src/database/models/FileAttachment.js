import { DataTypes, Model } from "sequelize";
import sequelize from "../../config/database.js";

class FileAttachment extends Model {}

FileAttachment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // LINK: The Foreign Key
    file_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "file_masters", // Matches the table name in DB
        key: "id",
      },
      onDelete: "CASCADE", // Critical for Clients: If they delete the file, attachments vanish automatically.
    },

    // META: Original Name (e.g., "Invoice_Oct.pdf")
    original_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // STORAGE: MinIO Key
    file_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // URL: Public/Presigned URL
    file_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // INFO: For UI Icons (PDF vs Image)
    mime_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // SIZE: For UI (e.g. "2.5 MB")
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "FileAttachment",
    tableName: "file_attachments",
    timestamps: true,
  },
);

export default FileAttachment;
