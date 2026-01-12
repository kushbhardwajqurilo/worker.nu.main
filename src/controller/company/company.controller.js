const { default: mongoose, mongo } = require("mongoose");
const {
  companyModel,
  companyAliasModel,
} = require("../../models/company.mode");
const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");
const { isValidCustomUUID } = require("custom-uuid-generator");

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
    tenantId,
    ...req.body,
    logo: req.files[0].path,
  };

  const insert = await companyModel.create(payload);

  if (!insert) {
    return next(new AppError("failed to add company", 400));
  }

  return sendSuccess(res, "Company Add Successfull", {}, 200, true);
});

// <-------- update company  --------->

exports.updateCompanyController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { c_id } = req.query;

  // ================= BASIC VALIDATION =================
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError("company credentials missing", 400));
  }

  if (!c_id) {
    return next(new AppError("company id missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(c_id)) {
    return next(new AppError("invalid company id", 400));
  }

  // ================= UPDATE DATA =================
  const updatedData = {
    ...req.body,
  };

  //  LOGO UPDATE (if sent)
  if (req.files && req.files.length > 0) {
    const logoFile = req.files.find((file) => file.fieldname === "logo");

    if (logoFile) {
      updatedData.logo = logoFile.path;
    }
  }
  const com = await companyModel.findOne({ _id: c_id, tenantId });

  const result = await companyModel.updateOne(
    { _id: c_id, tenantId },
    { $set: updatedData }
  );

  if (result.modifiedCount === 0) {
    return next(new AppError("Failed to update", 400));
  }

  return sendSuccess(res, "Update Successful", {}, 200, true);
});

// <-------- update company  end--------->

// <------- get company details -------->

exports.getCompanyDetailController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  // ================= BASIC VALIDATION =================
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  if (!req.query || req.query.length === 0) {
    return next(new AppError("company credentails missing"));
  }
  if (!req.query.c_id || req.query.c_id.length === 0) {
    return next(new AppError("company id missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(req.query.c_id)) {
    return next(new AppError("Invalid company id", 400));
  }

  const find = await companyModel.findOne({ _id: req.query.c_id, tenantId });
  if (!find || find.length === 0) {
    return next(new AppError("failed to fatch", 400));
  }
  return sendSuccess(res, "success", find, 200, true);
});

// <------- get company details end -------->

// <-------- Company Alias ----------->

exports.addCompanyAlias = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  // ================= BASIC VALIDATION =================
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

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
    company_alias: {
      ...req.body,
      tenantId,
      logo: logoFile.path, // cloudinary URL
    },
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
  const { c_id } = req.query;
  if (!c_id || c_id.length === 0) {
    return next(new AppError("company id missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(c_id)) {
    return next(new AppError("invalid company id", 400));
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
  const { c_id } = req.query;
  if (!c_id || c_id.length === 0) {
    return next(new AppError("company id missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(c_id)) {
    return next(new AppError("invalid company id", 400));
  }
  const result = await companyAliasModel.findOne({
    tenantId,
    _id: c_id,
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
  // ================= BASIC VALIDATION =================
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  // c_id means company alias Object Id(_id)
  const { c_id } = req.query;
  if (!c_id || c_id.length === 0) {
    return next(new AppError("company id missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(c_id)) {
    return next(new AppError("invalid company id", 400));
  }
  // is alias exist or not ?
  const isAlias = await companyAliasModel.findOne({ _id: c_id });
  if (!isAlias) {
    return next(new AppError("alias not found.", 400));
  }
  const result = await companyAliasModel.updateOne(
    { tenantId, _id: c_id },
    req.body
  );
  if (result.modifiedCount === 0) {
    return next(new AppError("failed to update alias"));
  }
  return sendSuccess(res, "Alias update", {}, 201, true);
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
      { $set: { isDelete: true } }
    );
    if (!result || result.modifiedCount === 0) {
      return next(new AppError("failed to delete", 400));
    }
    return sendSuccess(res, "delete success", {}, true, 201);
  }
);
// <---------- Company Alida End ---------->
