import sequelize from "../../config/database.js";
import Department from "./Department.js";
import User from "./User.js";
import FileMaster from "./FileMaster.js";
import FileMovement from "./FileMovement.js";
import FileAttachment from "./FileAttachment.js";
import Designation from "./Designation.js";

// Define Associations
// 1. User & Department
Department.hasMany(User, { foreignKey: "department_id" });
User.belongsTo(Department, { foreignKey: "department_id", as: "department" });

Designation.hasMany(User, { foreignKey: "designation_id" });
User.belongsTo(Designation, {
  foreignKey: "designation_id",
  as: "designation",
});

// 2. File & User (Creator)
User.hasMany(FileMaster, { foreignKey: "created_by" });
FileMaster.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// 3. File & User (Current Holder)
User.hasMany(FileMaster, { foreignKey: "current_holder_id" });
FileMaster.belongsTo(User, {
  foreignKey: "current_holder_id",
  as: "currentHolder",
});

User.hasMany(FileMaster, { foreignKey: "verified_by" });
FileMaster.belongsTo(User, { foreignKey: "verified_by", as: "verifier" });

// 5. Position-Based Access Associations (NEW)
Designation.hasMany(FileMaster, { foreignKey: "current_designation_id" });
FileMaster.belongsTo(Designation, {
  foreignKey: "current_designation_id",
  as: "currentDesignation",
});

Department.hasMany(FileMaster, { foreignKey: "current_department_id" });
FileMaster.belongsTo(Department, {
  foreignKey: "current_department_id",
  as: "currentDepartment",
});

// 4. File & Department
Department.hasMany(FileMaster, { foreignKey: "department_id" });
FileMaster.belongsTo(Department, {
  foreignKey: "department_id",
  as: "department",
});

// 1. File has many movements (History)
FileMaster.hasMany(FileMovement, { foreignKey: "file_id", as: "movements" });
FileMovement.belongsTo(FileMaster, { foreignKey: "file_id", as: "file" });

FileMaster.hasMany(FileAttachment, {
  foreignKey: "file_id",
  as: "attachments",
});
FileAttachment.belongsTo(FileMaster, {
  foreignKey: "file_id",
  as: "masterFile",
});

// 2. Movement has a Sender (User)
User.hasMany(FileMovement, { foreignKey: "sent_by" });
FileMovement.belongsTo(User, { foreignKey: "sent_by", as: "sender" });

// 3. Movement has a Receiver (User)
User.hasMany(FileMovement, { foreignKey: "sent_to" });
FileMovement.belongsTo(User, { foreignKey: "sent_to", as: "receiver" });

Designation.hasMany(FileMovement, { foreignKey: "sent_by_designation_id" });
FileMovement.belongsTo(Designation, {
  foreignKey: "sent_by_designation_id",
  as: "senderDesignation", // We will use this alias in queries
});

// Export everything together
export {
  sequelize,
  Department,
  User,
  FileMaster,
  FileMovement,
  FileAttachment,
  Designation,
};
