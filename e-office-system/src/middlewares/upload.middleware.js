import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileTypeFromFile } from "file-type";
import AppError from "../utils/AppError.js";

const tmpUploadsDir = path.join(process.cwd(), "tmp_uploads");
fs.mkdirSync(tmpUploadsDir, { recursive: true });

const buildTempFilename = (file) => {
  const ext = path.extname(file.originalname || "");
  const uniqueSuffix = crypto.randomBytes(16).toString("hex");
  return `${file.fieldname}-${Date.now()}-${uniqueSuffix}${ext}`;
};

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpUploadsDir);
  },
  filename: (req, file, cb) => {
    try {
      cb(null, buildTempFilename(file));
    } catch (err) {
      cb(err);
    }
  },
});

// 3. Filter: Only allow PDFs for E-files
const pdfFilter = (req, file, cb) => {
  // Do not trust client-provided mimetype; validate via magic numbers after upload.
  cb(null, true);
};

// 4. Configure Multer for PDFs
export const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit: 10MB
  fileFilter: pdfFilter,
});

// 5. Filter: Only allow JPG/PNG for Signatures
const signatureFilter = (req, file, cb) => {
  // Do not trust client-provided mimetype; validate via magic numbers after upload.
  cb(null, true);
};

// 6. Configure Multer for Signatures
export const uploadSignature = multer({
  storage: diskStorage,
  limits: { fileSize: 100 * 1024 }, // Max 100KB
  fileFilter: signatureFilter,
});

const safeUnlink = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // best-effort cleanup
  }
};

export const validatePdfUploads = async (req, res, next) => {
  try {
    const files = Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];

    for (const file of files) {
      if (!file?.path) continue;
      const type = await fileTypeFromFile(file.path);
      if (!type || type.mime !== "application/pdf") {
        for (const f of files) safeUnlink(f?.path);
        return next(
          new AppError(
            "Invalid file signature. Only actual PDFs are allowed.",
            400,
          ),
        );
      }
    }

    next();
  } catch (err) {
    // On unexpected errors, cleanup temp files.
    const files = Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];
    for (const file of files) safeUnlink(file?.path);
    next(err);
  }
};

export const validateSignatureUpload = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file?.path) return next();

    const type = await fileTypeFromFile(file.path);
    const allowedMimes = new Set(["image/jpeg", "image/png"]);

    if (!type || !allowedMimes.has(type.mime)) {
      safeUnlink(file.path);
      return next(
        new AppError(
          "Invalid file signature. Only actual PNG/JPEG images are allowed.",
          400,
        ),
      );
    }

    next();
  } catch (err) {
    safeUnlink(req.file?.path);
    next(err);
  }
};
