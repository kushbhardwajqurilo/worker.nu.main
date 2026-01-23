const multer = require("multer");
const path = require("path");

// storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath =
      process.env.VERCEL_ENV === "production"
        ? "/tmp"
        : path.join(__dirname, "../../public/upload"); // ✅ go 2 levels up

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const ImageUpload = multer({ storage });
module.exports = ImageUpload;
