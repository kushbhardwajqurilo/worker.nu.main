const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../confing/cloudinaryConfig");
const AppError = require("../utils/errorHandler");

const signatureStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "signatures",
    resource_type: "image",
    public_id: (req, file) => `signature-${Date.now()}-${file.originalname}`,
  },
});

const uploadSignature = multer({
  storage: signatureStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new AppError("Only image files allowed", 400));
    }
    cb(null, true);
  },
}).single("signature");

module.exports = uploadSignature;
