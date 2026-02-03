import "dotenv/config";
import { sequelize, User } from "../models/index.js";
import { ROLES, DESIGNATIONS } from "../../config/constants.js";

const seedAdmin = async () => {
  try {
    console.log("🌱 Starting Admin Seeder...");

    await sequelize.authenticate();

    // 1. Check if an Admin already exists
    const existingAdmin = await User.findOne({
      where: { system_role: ROLES.ADMIN },
    });

    if (existingAdmin) {
      console.log("⚠️  Admin already exists. Skipping...");
      process.exit(0);
    }

    // 2. Create the First Admin
    // CHANGE THESE CREDENTIALS FOR YOUR LOCAL SETUP IF YOU WANT
    const adminData = {
      full_name: "System Administrator",
      phone_number: "9876543210", // Valid 10-digit Indian number
      password: "Admin@123", // Will be hashed automatically
      system_role: ROLES.ADMIN,
      designation: DESIGNATIONS.SYSTEM_ADMIN, // Or specific Admin title
      is_active: true,
      // email is optional, so we can skip it or add dummy
    };

    await User.create(adminData);

    console.log("✅ Super Admin created successfully!");
    console.log(`👉 Login Phone: ${adminData.phone_number}`);
    console.log(`👉 Login Pass: ${adminData.password}`);
  } catch (error) {
    console.error("❌ Seeder failed:", error);
  } finally {
    // Close connection so the script doesn't hang
    await sequelize.close();
  }
};

seedAdmin();
