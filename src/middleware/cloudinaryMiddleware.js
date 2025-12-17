const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../confing/cloudinaryConfig");
const multer = require("multer");
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "client-signtaure",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});
const upload = multer({ storage });
module.exports = upload;
