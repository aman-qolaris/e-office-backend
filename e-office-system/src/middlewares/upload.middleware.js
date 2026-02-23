import multer from "multer";
import path from "path";
import fs from "fs";

// 1. Create a temporary directory on the server's hard drive
const tempDir = path.join(process.cwd(), "tmp_uploads");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 2. Configure the Storage Engine (Disk Storage)
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
  storage: storage, // <-- Correctly using the 'storage' variable defined above
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
  storage: storage, // <-- Correctly reusing the same 'storage' variable here!
  limits: { fileSize: 100 * 1024 }, // Max 100KB
  fileFilter: signatureFilter,
});
