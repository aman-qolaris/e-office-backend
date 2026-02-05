import "dotenv/config";
import { sequelize, User, Designation } from "../models/index.js"; // Import Designation
import { ROLES, DESIGNATIONS } from "../../config/constants.js";

const seedAdmin = async () => {
  try {
    console.log("🌱 Starting Admin Seeder...");
    await sequelize.authenticate();

    // 1. Check if Admin exists
    const existingAdmin = await User.findOne({
      where: { system_role: ROLES.ADMIN },
    });

    if (existingAdmin) {
      console.log("⚠️  Admin already exists. Skipping...");
      process.exit(0);
    }

    // 2. GET DESIGNATION ID (⚠️ NEW STEP)
    // We must find the ID for "SYSTEM_ADMIN" (or whatever you called it in the Designation Seeder)
    const adminDesignation = await Designation.findOne({
      where: { name: DESIGNATIONS.SYSTEM_ADMIN },
    });

    if (!adminDesignation) {
      console.error(
        "❌ Error: 'SYSTEM_ADMIN' designation not found in DB. Run designationSeeder first!",
      );
      process.exit(1);
    }

    // 3. Create Admin
    const adminData = {
      full_name: "System Administrator",
      phone_number: "9876543210",
      password: "Admin@123",
      system_role: ROLES.ADMIN,

      // ⚠️ CHANGED: Use the ID we found, not the string
      designation_id: adminDesignation.id,

      department_id: 1, // Ensure you have a department with ID 1 (e.g. General Administration)
      is_active: true,
    };

    await User.create(adminData);

    console.log("✅ Super Admin created successfully!");
  } catch (error) {
    console.error("❌ Seeder failed:", error);
  } finally {
    await sequelize.close();
  }
};

seedAdmin();
