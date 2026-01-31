import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

const app = express();

// 1. Global Middlewares
app.use(helmet()); // Security Headers
app.use(cors()); // Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan("dev")); // HTTP Request Logger

// 2. Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({
    system: "Maharashtra Mandal e-Office",
    status: "OPERATIONAL",
    timestamp: new Date().toISOString(),
  });
});

// 3. Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
