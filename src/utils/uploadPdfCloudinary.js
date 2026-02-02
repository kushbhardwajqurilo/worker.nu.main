const { cloudinary } = require("../confing/cloudinaryConfig");

exports.uploadPdfToCloudinary = async (filePath) => {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "image",
    folder: "weekly_timesheets",
    use_filename: true,
    unique_filename: true,
  });
  return {
    url: result.secure_url,
    publickId: result.public_id,
  };
};
