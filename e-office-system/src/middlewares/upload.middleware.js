import multer, { diskStorage } from "multer";
import path from "path";
import fs from "fs";

const tempDir = path.join(process.cwd(), "tmp_uploads");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 1. Storage: Keep file in Memory (Buffer)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

// 2. Filter: Only allow PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF files are allowed!"), false);
  }
};

// 3. Configure Multer
export const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit: 10MB
  fileFilter: fileFilter,
});

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

// 5. Configure Multer for Signatures
export const uploadSignature = multer({
  storage: diskStorage, // Reuse the disk storage
  limits: { fileSize: 100 * 1024 }, // Max 100KB (we'll strictly enforce 50KB in the controller)
  fileFilter: signatureFilter,
});
