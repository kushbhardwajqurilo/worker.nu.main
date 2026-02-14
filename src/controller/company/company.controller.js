const { default: mongoose } = require("mongoose");

const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");
const { isValidCustomUUID } = require("custom-uuid-generator");
const companyAliasModel = require("../../models/company.mode");
const adminModel = require("../../models/authmodel/adminModel");
// <------- get company details end -------->

exports.addCompanyController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError("company credentials missing", 400));
  }

  const requiredFields = [
    "company_name",
    "phone",
    "timezone",
    "company_registration_no",
    "company_address",
    "language",
  ];

  for (let field of requiredFields) {
    if (!req.body[field] || req.body[field].toString().trim().length === 0) {
      return next(new AppError(`${field} Field Missing`, 400));
    }
  }

  const payload = {
    phone: req.body.phone,
    timezone: req.body.timezone,
    company_registration_no: req.body.company_registration_no,
    company_address: req.body.company_address,
    language: req.body.language,
    email: req.body.notification_email,
    company_name: req.body.company_name,
    logo: req.files[0].path,
  };
  const insert = await adminModel.updateOne(
    { tenantId },
    { $set: payload },
    { $new: true },
  );

  if (!insert) {
    return next(new AppError("failed to add company", 400));
  }

  return sendSuccess(res, "Company Add Successfull", {}, 200, true);
});

exports.getCompanyDetailController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  // ================= BASIC VALIDATION =================
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  if (!req.query || req.query.length === 0) {
    return next(new AppError("company credentails missing"));
  }
  const find = await adminModel
    .findOne({ tenantId })
    .select(
      "logo company_name phone timezone company_registration_no company_address email",
    );
  if (!find || find.length === 0) {
    return next(new AppError("failed to fatch", 400));
  }
  return sendSuccess(res, "success", [find], 200, true);
});

// <-------- Company Alias ----------->

exports.addCompanyAlias = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  console.log("ss", tenantId);
  // if (!isValidCustomUUID(tenantId)) {
  //   return next(new AppError("Invalid Tenant-Id", 400));
  // }

  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError("company alias missing", 400));
  }
  const requiredFields = [
    "company_name",
    "phone",
    "timezone",
    "company_registration_no",
    "company_address",
    "notification_email",
    "language",
  ];

  for (let field of requiredFields) {
    if (!req.body[field] || req.body[field].toString().trim().length === 0) {
      return next(new AppError(`${field} Field Missing`, 400));
    }
  }

  // ================= LOGO FILE =================
  const logoFile = req.files?.find((file) => file.fieldname === "logo");

  if (!logoFile) {
    return next(new AppError("logo Field Missing", 400));
  }
  const payload = {
    tenantId,

    ...req.body,

    logo: logoFile.path, // cloudinary URL
  };
  await companyAliasModel.create(payload);

  return sendSuccess(res, "Company alias added", {}, 201, true);
});

// get all company alias
exports.getAllCompanyAliasController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  // ================= BASIC VALIDATION =================
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  const companyAlias = await companyAliasModel.find({
    tenantId,
    isDelete: { $ne: true },
  });
  if (!companyAlias || companyAlias.length === 0) {
    return next(new AppError("no company alias found", 400));
  }
  return sendSuccess(res, "company alias fetched", companyAlias, 200, true);
});

// get single company alias
exports.getSingleCompanyAliasController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  // ================= BASIC VALIDATION =================
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  const result = await companyAliasModel.findOne({
    tenantId,
    isDelete: { $ne: true },
  });
  if (!result) {
    return next(new AppError("no company alias found", 400));
  }
  return sendSuccess(res, "success", result, 200, true);
});

// update company alias
exports.updateCompanyAliasController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  console.log("ss", tenantId);
  // if (!isValidCustomUUID(tenantId)) {
  //   return next(new AppError("Invalid Tenant-Id", 400));
  // }

  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError("company alias missing", 400));
  }
  const requiredFields = [
    "company_name",
    "phone",
    "company_registration_no",
    "company_address",
    "language",
  ];

  for (let field of requiredFields) {
    if (!req.body[field] || req.body[field].toString().trim().length === 0) {
      return next(new AppError(`${field} Field Missing`, 400));
    }
  }

  // ================= LOGO FILE =================
  const logoFile = req.files?.find((file) => file.fieldname === "logo");

  if (!logoFile) {
    return next(new AppError("logo Field Missing", 400));
  }
  const payload = {
    tenantId,

    ...req.body,

    logo: logoFile.path, // cloudinary URL
  };
  await companyAliasModel.create(payload);

  return sendSuccess(res, "Company alias added", {}, 201, true);
});

// delete company alias
exports.deleteCompanyAliasController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  // ================= BASIC VALIDATION =================
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  // c_id means company alias ObjectId (_id)
  const { c_id } = req.query;
  if (!c_id || c_id.length === 0) {
    return next(new AppError("company id missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(c_id)) {
    return next(new AppError("invalid company id", 400));
  }
  const isAliasExist = await companyAliasModel.findOne({ tenantId, _id: c_id });
  if (!isAliasExist) {
    return next(new AppError("alias not found", 400));
  }
  isAliasExist.isDelete = true;
  await isAliasExist.save();
  return sendSuccess(res, "Alias delete successfull", {}, 201, true);
});

// delete multiple company alias
exports.deleteMultipleCompanyAliasController = catchAsync(
  async (req, res, next) => {
    const { tenantId } = req;
    // ================= BASIC VALIDATION =================
    if (!isValidCustomUUID(tenantId)) {
      return next(new AppError("Invalid Tenant-Id", 400));
    }
    const { c_id } = req.body;
    if (!c_id || c_id.length === 0) {
      return next(new AppError("company id missing", 400));
    }
    if (Array.isArray(c_id)) {
      for (let id of c_id) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return next(new AppError(`Invalid alias id: ${id}`, 400));
        }
      }
    }
    const result = await companyAliasModel.updateMany(
      { _id: { $in: c_id }, tenantId: { $in: tenantId } },
      { $set: { isDelete: true } },
    );
    if (!result || result.modifiedCount === 0) {
      return next(new AppError("failed to delete", 400));
    }
    return sendSuccess(res, "delete success", {}, true, 201);
  },
);
// <---------- Company Alida End ---------->
