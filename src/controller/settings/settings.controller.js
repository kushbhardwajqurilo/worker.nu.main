const { default: mongoose } = require("mongoose");
const {
  HolidaySickness,
} = require("../../models/settingModels/settings.model");
const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");
const {
  workerPositionModel,
  workerModel,
} = require("../../models/workerModel");
const { fields } = require("../../middleware/cloudinaryMiddleware");
const { isValidCustomUUID } = require("custom-uuid-generator");
const { findOne } = require("../../models/workerCouter.model");
const HoursSettingsModel = require("../../models/settingModels/hours.settings.model");

// <--------- Custom Field setting start ------------>

// <--------- worker position start ---------->

exports.addWorkerPosition = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId) {
    return next(new AppError("tenant id missing in request", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }
  const { position } = req.body;
  if (!position) {
    return next(new AppError("position missing", 400));
  }
  const insert = await workerPositionModel.create({ tenantId, position });
  if (!insert) {
    return next(new AppError("failed to add", 400));
  }
  const data = [{ _id: insert._id }];
  return sendSuccess(res, "position add successfully", data, 200, true);
});

exports.getAllPositions = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

  // ================= PAGINATION =================
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit =
    Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;

  const skip = (page - 1) * limit;

  // ================= COUNT =================
  const totalPositions = await workerPositionModel.countDocuments({
    tenantId,
    isDelete: { $ne: true },
  });

  if (totalPositions === 0) {
    return next(new AppError("Position not found", 200));
  }

  // ================= LIST =================
  const positionList = await workerPositionModel
    .find({
      tenantId,
      isDelete: { $ne: true },
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  const result = positionList.map((val, pos) => {
    return { s_no: pos + 1, _id: val._id, position: val.position };
  });
  console.log(result);
  // ================= RESPONSE =================
  return sendSuccess(
    res,
    "Position list fetched successfully",
    {
      total: totalPositions,
      page,
      limit,
      totalPages: Math.ceil(totalPositions / limit),
      positions: result,
    },
    200,
    true
  );
});

exports.deletePosition = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId) {
    return next(new AppError("tenant id missing in request", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }
  const { wpi } = req.query;
  if (!wpi) {
    return next(new AppError("wpi missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(wpi)) {
    return next(new AppError("Invalid wpi", 400));
  }
  const result = await workerPositionModel.updateOne(
    { tenantId, _id: wpi },
    { isDelete: true }
  );

  if (result.modifiedCount === 0) {
    return next(new AppError("Worker position not found", 404));
  }
  return sendSuccess(res, "Position deleted successfully", {}, 200, true);
});

// <--------- worker position end ---------->
// <---------- Holidays and sickness --------->

exports.addOrUpdateHolidaySettings = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  /* -------------------- Tenant Validation -------------------- */
  if (!tenantId) {
    return next(new AppError("Tenant id missing in request", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }

  const { monthly_limit } = req.body;

  if (
    monthly_limit !== undefined &&
    (typeof monthly_limit !== "number" || monthly_limit < 0)
  ) {
    return next(
      new AppError("Holiday monthly limit must be a positive number", 400)
    );
  }

  /* -------------------- Update -------------------- */
  const updatePayload = {
    "holiday.monthly_limit": monthly_limit ?? 0,
  };

  const result = await HolidaySickness.findOneAndUpdate(
    { tenantId },
    { $set: updatePayload },
    { new: true, upsert: true, runValidators: true }
  );

  /* -------------------- Worker Sync -------------------- */
  if (monthly_limit !== undefined) {
    await workerModel.updateMany(
      { tenantId },
      {
        $set: {
          "worker_holiday.holidays_per_month": monthly_limit,
        },
      }
    );
  }

  return sendSuccess(res, "Holiday settings saved successfully", {}, 200, true);
});

exports.addOrUpdateSicknessSettings = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  /* -------------------- Tenant Validation -------------------- */
  if (!tenantId) {
    return next(new AppError("Tenant id missing in request", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }

  const { monthly_limit } = req.body;

  if (
    monthly_limit !== undefined &&
    (typeof monthly_limit !== "number" || monthly_limit < 0)
  ) {
    return next(
      new AppError("Sickness monthly limit must be a positive number", 400)
    );
  }

  /* -------------------- Update -------------------- */
  const updatePayload = {
    "sickness.monthly_limit": monthly_limit ?? 0,
  };

  const result = await HolidaySickness.findOneAndUpdate(
    { tenantId },
    { $set: updatePayload },
    { new: true, upsert: true, runValidators: true }
  );

  /* -------------------- Worker Sync -------------------- */
  if (monthly_limit !== undefined) {
    await workerModel.updateMany(
      { tenantId },
      {
        $set: {
          "worker_holiday.sickness_per_month": monthly_limit,
        },
      }
    );
  }

  return sendSuccess(
    res,
    "Sickness settings saved successfully",
    {},
    200,
    true
  );
});

exports.getHolidaySicknessSettings = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId) {
    return next(new AppError("tenant id missing in request", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }
  const settings = await HolidaySickness.findOne({ tenantId });

  if (!settings) {
    return sendSuccess(res, "No settings found", {}, 200, true);
  }
  const result = {
    _id: settings._id,
    monthly_limit: settings.sickness.monthly_limit,
  };
  return sendSuccess(res, "Settings fetched successfully", [result], 200, true);
});

exports.getHolidaySettings = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId) {
    return next(new AppError("tenant id missing in request", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }
  const settings = await HolidaySickness.findOne({ tenantId });

  if (!settings) {
    return sendSuccess(res, "No settings found", {}, 200, true);
  }
  const result = {
    _id: settings._id,
    monthly_limit: settings.holiday.monthly_limit,
  };
  return sendSuccess(res, "Settings fetched successfully", [result], 200, true);
});
// <----------- Holidays and sickness end --------->

// <---------- Hours Settings start ----------------->

exports.HoursSettingsController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("tenant id missing in request", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }

  // jo bhi fields update/add karni ho
  const payload = {
    ...req.body,
    tenantId,
  };

  const hours_setting = await HoursSettingsModel.findOneAndUpdate(
    { tenantId }, // condition
    { $set: payload }, // update data
    {
      new: true, // updated/new document return kare
      upsert: true, // agar nahi mile to insert kare
    }
  );

  return res.status(200).json({
    status: true,
    message: "Hours settings saved successfully",
    data: hours_setting,
  });
});

// get hours settings
exports.getHoursSettingsControlle = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId) {
    return next(new AppError("Tenant-id missing", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

  const data = await HoursSettingsModel.findOne({ tenantId });
  if (!data) {
    return sendSuccess(res, "no data found", [], 200, true);
  }
  return sendSuccess(res, "data fetched", [data], 201, true);
});
//  <------------- Hours settings end --------------->
