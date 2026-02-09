import { DataTypes, Model } from "sequelize";
import sequelize from "../../config/database.js";
import { MOVEMENT_ACTIONS } from "../../config/constants.js";

class FileMovement extends Model {}

FileMovement.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Which file is moving?
    file_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Who sent it?
    sent_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Who received it?
    sent_to: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // What happened? (FORWARD, REVERT, APPROVE, REJECT)
    action: {
      type: DataTypes.ENUM(...Object.values(MOVEMENT_ACTIONS)),
      allowNull: false,
    },

    // User's comment ("Please check budget")
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Was the file read by the receiver? (For "Unread" badges later)
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "FileMovement",
    tableName: "file_movements",
    timestamps: true,
  },
);

export default FileMovement;
