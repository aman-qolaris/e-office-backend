import { DataTypes, Model } from "sequelize";
import bcrypt from "bcryptjs";
import sequelize from "../../config/database.js";
import { ROLES, DESIGNATIONS } from "../../config/constants.js";

class User extends Model {
  // 1. Helper to check Password during Login
  async validatePassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // 2. Helper to check PIN during File Approval
  async validatePin(pin) {
    if (!this.security_pin) return false;
    return await bcrypt.compare(pin, this.security_pin);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // --- CREDENTIALS ---

    // Primary Login ID (Indian Mobile)
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        // Regex: Starts with 6,7,8,or 9, followed by 9 digits
        is: /^[6-9]\d{9}$/,
      },
    },

    // Optional Profile Field
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: { isEmail: true },
    },

    // Hashed Password
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // --- PROFILE ---

    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // --- PERMISSIONS ---

    // Controls API Access (ADMIN, STAFF, BOARD_MEMBER)
    system_role: {
      type: DataTypes.ENUM(...Object.values(ROLES)),
      allowNull: false,
      defaultValue: ROLES.STAFF,
    },

    // Controls Organization Title (President, Secretary, Member)
    designation: {
      type: DataTypes.ENUM(...Object.values(DESIGNATIONS)),
      allowNull: false,
      defaultValue: DESIGNATIONS.MEMBER,
    },

    // --- SECURITY ---

    // Hashed PIN for "Digital Signature" approvals
    security_pin: {
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
    modelName: "User",
    tableName: "users",
    timestamps: true,
    hooks: {
      // AUTOMATIC SECURITY: Hash password/PIN before saving to DB
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
        if (user.security_pin) {
          user.security_pin = await bcrypt.hash(user.security_pin, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 10);
        }
        if (user.changed("security_pin")) {
          user.security_pin = await bcrypt.hash(user.security_pin, 10);
        }
      },
    },
  },
);

export default User;
