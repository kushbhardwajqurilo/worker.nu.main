const crypto = require("crypto");

exports.getCloudinarySignature = (req, res) => {
  const expireAfterMinutes = 5;
  const timestamp = Math.round(Date.now() / 1000) + expireAfterMinutes * 60;
  const folder = "worker_project";

  const stringToSign = `folder=${folder}&timestamp=${timestamp}${process.env.CloudinarySecretKey}`;
  const signature = crypto
    .createHash("sha256")
    .update(stringToSign)
    .digest("hex");

  res.json({
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CloudName}/auto/upload`,
    timestamp,
    signature,
    folder,
    apiKey: process.env.CloudinaryApiKey,
    expiresIn: `${expireAfterMinutes} minutes`,
  });
};
