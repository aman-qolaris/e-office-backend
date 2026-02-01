import multer from "multer";

// 1. Storage: Keep file in Memory (Buffer)
const storage = multer.memoryStorage();

// 2. Filter: Only allow PDF and Images
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "application/pdf" ||
    file.mimetype.startsWith("image/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF and Images are allowed!"), false);
  }
};

// 3. Configure Multer
export const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit: 10MB
  fileFilter: fileFilter,
});
