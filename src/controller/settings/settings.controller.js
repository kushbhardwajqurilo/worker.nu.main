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
  const data = { _id: insert._id };
  return sendSuccess(res, "position add successfully", data, 200, true);
});

exports.getAllPositions = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId) {
    return next(new AppError("tenant id missing in request", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }
  const result = await workerPositionModel.find({
    tenantId,
    isDelete: { $ne: true },
  });
  if (!result || result.length === 0) {
    return next(new AppError("Position not found", 200));
  }
  return sendSuccess(res, "success", result, 200, true);
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

exports.addOrUpdateHolidaySicknessSettings = catchAsync(
  async (req, res, next) => {
    const { holiday, sickness } = req.body;

    if (!holiday && !sickness) {
      return next(new AppError("Settings data missing", 400));
    }

    if (
      holiday?.monthly_limit !== undefined &&
      (typeof holiday.monthly_limit !== "number" || holiday.monthly_limit < 0)
    ) {
      return next(
        new AppError("Holiday monthly limit cannot be negative", 400)
      );
    }

    if (
      sickness?.monthly_limit !== undefined &&
      (typeof sickness.monthly_limit !== "number" || sickness.monthly_limit < 0)
    ) {
      return next(
        new AppError("Sickness monthly limit cannot be negative", 400)
      );
    }

    const existing = await HolidaySickness.findOne({});
    let result;

    if (existing) {
      result = await HolidaySickness.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            holiday: {
              enabled: holiday?.enabled ?? existing.holiday.enabled,
              monthly_limit:
                holiday?.monthly_limit ?? existing.holiday.monthly_limit,
            },
            sickness: {
              enabled: sickness?.enabled ?? existing.sickness.enabled,
              monthly_limit:
                sickness?.monthly_limit ?? existing.sickness.monthly_limit,
            },
          },
        },
        { new: true }
      );
    } else {
      result = await HolidaySickness.create({
        holiday: holiday ?? { enabled: false, monthly_limit: 0 },
        sickness: sickness ?? { enabled: false, monthly_limit: 0 },
      });
    }

    const workerUpdate = {};

    if (holiday?.monthly_limit !== undefined) {
      workerUpdate["worker_holiday.holidays_per_month"] = holiday.monthly_limit;
    }

    if (sickness?.monthly_limit !== undefined) {
      workerUpdate["worker_holiday.sickness_per_month"] =
        sickness.monthly_limit;
    }

    if (Object.keys(workerUpdate).length > 0) {
      await workerModel.updateMany({}, { $set: workerUpdate });
    }

    if (!result) {
      return next(new AppError("Failed to save settings", 400));
    }

    return sendSuccess(
      res,
      "Holiday & sickness settings saved successfully",
      result,
      200,
      true
    );
  }
);

exports.getHolidaySicknessSettings = catchAsync(async (req, res, next) => {
  const settings = await HolidaySickness.findOne({});

  if (!settings) {
    return sendSuccess(res, "No settings found", {}, 200, true);
  }

  return sendSuccess(res, "Settings fetched successfully", settings, 200, true);
});

// <----------- Holidays and sickness end --------->
