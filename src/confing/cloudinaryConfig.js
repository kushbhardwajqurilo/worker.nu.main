const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;

// Cloudinary base config
cloudinary.config({
  cloud_name: process.env.CloudName,
  api_key: process.env.CloudinaryApiKey,
  api_secret: process.env.CloudinarySecretKey,
  secure: true,
});

// Generate signature for frontend uploads
const getCloudinarySignature = (req, res) => {
  const expireAfterMinutes = 5;
  const timestamp = Math.round(Date.now() / 1000) + expireAfterMinutes * 60;
  const folder = "worker_project";

  // Cloudinary official format:
  const stringToSign = `folder=${folder}&timestamp=${timestamp}`;

  // Signature generation
  const signature = crypto
    .createHash("sha256")
    .update(stringToSign + process.env.CloudinarySecretKey)
    .digest("hex");

  res.json({
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CloudName}/auto/upload`,
    apiKey: process.env.CloudinaryApiKey,
    timestamp,
    folder,
    signature,
    expiresIn: `${expireAfterMinutes} minutes`,
  });
};

module.exports = { cloudinary, getCloudinarySignature };
