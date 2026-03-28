import multer from "multer";
import path from "path";
import crypto from "crypto";
import multerS3 from "multer-s3";
import { BUCKET_NAME } from "../config/minio.js";
import { s3Client } from "../config/s3.js";

const buildDeptCode = (req) => {
  const deptName = req?.user?.department?.name;
  if (typeof deptName === "string" && deptName.trim().length >= 3) {
    return deptName.trim().substring(0, 3).toUpperCase();
  }

  const deptId = req?.user?.department_id;
  if (deptId !== undefined && deptId !== null) {
    return `D${deptId}`;
  }

  return "GEN";
};

const uniqueSuffix = () => `${Date.now()}-${crypto.randomInt(1000, 10000)}`;

const pdfStorage = multerS3({
  s3: s3Client,
  bucket: BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname) || ".pdf";
      const year = new Date().getFullYear();
      const deptCode = buildDeptCode(req);
      const fileId = req?.params?.id;
      const fileSegment = fileId ? `file-${fileId}` : "misc";

      cb(
        null,
        `files/${year}/${deptCode}/${fileSegment}/attachments/${uniqueSuffix()}${ext}`,
      );
    } catch (err) {
      cb(err);
    }
  },
});

const signatureStorage = multerS3({
  s3: s3Client,
  bucket: BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `signatures/users/${uniqueSuffix()}${ext}`);
    } catch (err) {
      cb(err);
    }
  },
});

// 3. Filter: Only allow PDFs for E-files
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF files are allowed!"), false);
  }
};

// 4. Configure Multer for PDFs
export const upload = multer({
  storage: pdfStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit: 10MB
  fileFilter: pdfFilter,
});

// 5. Filter: Only allow JPG/PNG for Signatures
const signatureFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPG/PNG images are allowed for signatures!",
      ),
      false,
    );
  }
};

// 6. Configure Multer for Signatures
export const uploadSignature = multer({
  storage: signatureStorage,
  limits: { fileSize: 100 * 1024 }, // Max 100KB
  fileFilter: signatureFilter,
});
