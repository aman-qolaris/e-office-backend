import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { globalLimiter } from "./middlewares/rateLimiter.middleware.js";

import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./config/swagger.js";

const app = express();
app.set("trust proxy", 1);
// 1. Global Middlewares
app.use(helmet()); // Security Headers
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use("/api", globalLimiter);
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser());
app.use(morgan("dev")); // HTTP Request Logger

// This serves the interactive documentation at http://localhost:4000/api-docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// 2. Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({
    system: "Maharashtra Mandal e-Office",
    status: "OPERATIONAL",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1", routes);

// 3. Global Error Handler
// 3. Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.code === "LIMIT_FILE_SIZE" ? "File is too large. Max size is 100KB." : err.message,
    });
  }

  // Handle Custom AppErrors FIRST (401, 403, 404, etc.)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Handle Joi Validation Errors safely
  // (Assuming Joi errors have isJoi = true or name = 'ValidationError')
  if (err.isJoi || err.name === 'ValidationError' || err.message.includes("must be") || err.message.includes("required")) {
    return res.status(400).json({
      success: false,
      message: err.message, // Use the actual validation message instead of generic "Validation Error"
    });
  }

  // Handle Unknown Server Crashes (500)
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
