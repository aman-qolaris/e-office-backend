import { DataTypes, Model } from "sequelize";
import sequelize from "../../config/database.js";

class Designation extends Model {}

Designation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // e.g. "President", "Clerk"
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      comment: "Higher number = Higher Rank (e.g. President=100, Clerk=10)",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "Designation",
    tableName: "designations",
    timestamps: true,
  },
);

export default Designation;
