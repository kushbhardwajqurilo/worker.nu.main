const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../confing/cloudinaryConfig");
const { AppError } = require("../utils/errorHandler");

const allowedFormats = ["jpg", "jpeg", "png", "webp", "avif"];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = file.mimetype.split("/")[1];

    if (!allowedFormats.includes(ext)) {
      throw new AppError("Invalid file type", 400);
    }

    return {
      folder: "worker_uploads",
      resource_type: "image",
      public_id: `worker-${Date.now()}`,
      format: ext,
      transformation: [
        { width: 1200, height: 1200, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    };
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 7 * 1024 * 1024, // 5MB
    files: 10,
  },
});

/**
 * IMPORTANT:
 * upload.any() is REQUIRED because frontend uses:
 * other_files.0.files
 * other_files.1.files
 */
module.exports.uploadDocuments = upload.any();
