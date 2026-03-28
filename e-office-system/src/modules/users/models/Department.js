import { DataTypes, Model } from "sequelize";
import sequelize from "../../../config/database.js";

class Department extends Model {}

Department.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Example: "IT Cell", "Accounts", "Secretariat"
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "Department",
    tableName: "departments",
    timestamps: true,
  },
);

export default Department;
