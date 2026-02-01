import sequelize from "../../config/database.js";
import Department from "./Department.js";
import User from "./User.js";
import FileMaster from "./FileMaster.js";

// Define Associations
// 1. User & Department
Department.hasMany(User, { foreignKey: "department_id" });
User.belongsTo(Department, { foreignKey: "department_id", as: "department" });

// 2. File & User (Creator)
User.hasMany(FileMaster, { foreignKey: "created_by" });
FileMaster.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// 3. File & User (Current Holder)
User.hasMany(FileMaster, { foreignKey: "current_holder_id" });
FileMaster.belongsTo(User, {
  foreignKey: "current_holder_id",
  as: "currentHolder",
});

// 4. File & Department
Department.hasMany(FileMaster, { foreignKey: "department_id" });
FileMaster.belongsTo(Department, {
  foreignKey: "department_id",
  as: "department",
});

// Export everything together
export { sequelize, Department, User, FileMaster };
