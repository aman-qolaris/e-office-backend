import sequelize from "../../config/database.js";
import Department from "./Department.js";
import User from "./User.js";

// Define Associations
// 1 Department has Many Users
Department.hasMany(User, { foreignKey: "department_id", as: "employees" });

// 1 User belongs to 1 Department
User.belongsTo(Department, { foreignKey: "department_id", as: "department" });

// Export everything together
export { sequelize, Department, User };
