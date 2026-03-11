const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../confing/cloudinaryConfig");
const { AppError } = require("../utils/errorHandler");

const allowedFormats = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "pdf",
  "docx",
  "doc",
  "msword",
  "vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = file.mimetype.split("/")[1];
    console.log();
    if (!allowedFormats.includes(ext)) {
      console.log("file type", ext);
      throw new AppError("Invalid file type", 400);
    }

    const isImage = ["jpg", "jpeg", "png", "webp", "avif"].includes(ext);
    const resource_type = isImage ? "image" : "raw";
    const Isdoc = [
      "docx",
      "doc",
      "vnd.openxmlformats-officedocument.wordprocessingml.document",
      "msword",
    ].includes(ext);
    const IsPdf = ["pdf"].includes(ext);
    return {
      folder: "worker_uploads",
      resource_type: resource_type,
      public_id: `worker-${Date.now()}`,
      // format: ext,

      format: isImage ? ext : IsPdf ? "pdf" : "docx",
      ...(isImage && {
        transformation: [
          { width: 1200, height: 1200, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      }),
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
