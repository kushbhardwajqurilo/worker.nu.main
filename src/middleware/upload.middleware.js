const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../confing/cloudinaryConfig");
const { AppError } = require("../utils/errorHandler");

const allowedFormats = ["jpg", "jpeg", "png", "webp", "pdf"];

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "worker_uploads",
    resource_type: "auto",
    format: async (req, file) => {
      const ext = file.mimetype.split("/")[1];
      if (!allowedFormats.includes(ext)) {
        throw new AppError("Invalid file type", 400);
      }
      return ext;
    },
    public_id: (req, file) =>
      `${Date.now()}-${file.originalname.split(".")[0]}`,
  },
});

const upload = multer({ storage });

/**
 * IMPORTANT:
 * upload.any() is REQUIRED because frontend uses:
 * other_files.0.files
 * other_files.1.files
 */
module.exports.uploadDocuments = upload.any();
