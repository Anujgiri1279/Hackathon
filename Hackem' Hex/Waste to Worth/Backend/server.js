import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Route imports
import analyzeRoutes from "./routes/analyze.js";
import marketplaceRoutes from "./routes/marketplace.js";
import servicesRoutes from "./routes/services.js";
import dashboardRoutes from "./routes/dashboard.js";
import upcycleRoutes from "./routes/upcycle.js";
import adminRoutes from "./routes/admin.js";
import userRoutes from "./routes/users.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// File upload middleware (for multipart form data)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
      error.status = 400;
      cb(error);
    }
  }
});

// Attach upload middleware globally so routes can use it
app.use((req, res, next) => {
  req.uploadSingle = upload.single("image");
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

app.use("/api/analyze", analyzeRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/upcycle", upcycleRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);

  // Handle multer errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const message = err.message || "Request failed";
  const isStorageError = /bucket|storage|supabase/i.test(message);
  const isAiError = /gemini|openai|openrouter|ai provider|identif/i.test(message);
  const isAuthError = /auth|email|password|credentials|confirmed|verified/i.test(message);
  const code = isStorageError
    ? "STORAGE_UNAVAILABLE"
    : isAiError
      ? "AI_UNAVAILABLE"
      : isAuthError
        ? "AUTH_ERROR"
      : status >= 500
        ? "SERVER_UNAVAILABLE"
        : "REQUEST_INVALID";
  res.status(status).json({
    success: false,
    code,
    error: status < 500 ? message : (
      isStorageError ? "Image storage is unavailable. Check the waste-images bucket and Supabase connection."
        : isAiError ? "AI analysis is unavailable. Check the configured AI provider keys or quotas."
          : isAuthError ? message
          : "The server could not complete this request."
    )
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

// ============================================================================
// SERVER START
// ============================================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n✨ Waste2Worth Backend running on http://localhost:${PORT}`);
  console.log(`📍 CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:3000"}\n`);
});

export default app;
