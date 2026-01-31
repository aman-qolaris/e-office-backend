import "dotenv/config"; // Automatically loads .env
import app from "./src/app.js"; // Note the .js extension is mandatory in ESM
import { sequelize } from "./src/database/models/index.js"; // Will enable later

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    console.log("⏳ Starting Maharashtra Mandal e-Office System...");

    // Database connection will go here
    await sequelize.authenticate();
    console.log("✅ Database Connection Established.");

    // 2. Sync Models (Create Tables if not exist)
    // force: false means "don't delete data if table exists"
    // alter: true means "update table structure if model changes"
    await sequelize.sync({ alter: true });
    console.log("✅ Database Models Synced.");

    app.listen(PORT, () => {
      console.log(`
            ################################################
            🚀 Server running on http://localhost:${PORT}
            👉 Environment: ${process.env.NODE_ENV}
            ################################################
            `);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
