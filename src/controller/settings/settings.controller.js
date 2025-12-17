const { default: mongoose } = require("mongoose");
const {
  CustomField,
  CustomFieldGroup,
  HolidaySickness,
} = require("../../models/settingModels/settings.model");
const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");
const { workerPositionModel } = require("../../models/workerModel");
const { fields } = require("../../middleware/cloudinaryMiddleware");

// <--------- Custom Field setting start ------------>

exports.addCustomField = catchAsync(async (req, res, next) => {
  const requiredFields = ["type", "description", "label", "isRequired"];
  for (let fields of requiredFields) {
    if (!req.body[fields] || req.body[fields].toString().trim().length === 0) {
      return next(new AppError(`${fields} missing`, 400));
    }
  }
  const feilds = {
    type: req.body.type,
    label: req.body.label,
    description: req.body.description,
    isRequired: req.body.isRequired,
  };
  const addFeilds = await CustomField.create(feilds);
  if (!addFeilds) {
    return next(new AppError("failed to add custom field"));
  }
  return sendSuccess(res, "success", {}, 200, true);
});

exports.updateCustomField = catchAsync(async (req, res, next) => {
  const { cfid } = req.query;

  // ID validation
  if (!cfid) {
    return next(new AppError("cfid missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(cfid)) {
    return next(new AppError("cfid not valid", 400));
  }

  // Required body fields
  const requiredFields = ["type", "label", "description"];

  for (let field of requiredFields) {
    if (
      req.body[field] === undefined ||
      req.body[field].toString().trim().length === 0
    ) {
      return next(new AppError(`${field} missing`, 400));
    }
  }

  //  Update
  const updatedField = await CustomField.findByIdAndUpdate(
    cfid,
    {
      type: req.body.type,
      label: req.body.label,
      description: req.body.description,
      isRequired: req.body.isRequired,
      isActive: req.body.isActive,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedField) {
    return next(new AppError("Custom field not found", 404));
  }

  return sendSuccess(res, "Custom field updated", updatedField, 200, true);
});

exports.getAllCustomfields = catchAsync(async (req, res, next) => {
  const fields = await CustomField.find({ isActive: true });
  if (fields.length === 0) {
    return next(new AppError("Failed Try Again Later", 400));
  }
  return sendSuccess(res, "success", fields, 200, true);
});

exports.deleteCustomFields = catchAsync(async (req, res, next) => {
  const { cfid } = req.query;
  if (!cfid) {
    return next(new AppError("cfid missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(cfid)) {
    return next(new AppError("Invalid cfid", 400));
  }
  const delete_feild = await CustomField.findByIdAndUpdate(cfid, {
    isActive: false,
  });
  if (!delete_feild) {
    return next(new AppError("Try Again Later", 400));
  }
  return sendSuccess(res, "Delete Successfull", {}, 201, true);
});
// <--------- Custom Field setting end ------------>

// <-------- custom preselect group start ---------->

exports.addPreSelectGroup = catchAsync(async (req, res, next) => {
  const { groupName, customField } = req.body;
  if (!groupName || groupName.length === 0) {
    return next(new AppError("group name missing", 400));
  }
  if (!customField || customField.length === 0) {
    return next(new AppError("custom field missing", 400));
  }

  const payload = {
    groupName,
    fields: customField,
  };
  const insert = await CustomFieldGroup.create(payload);
  if (!insert) {
    return next(new AppError("failed to add", 400));
  }
  return sendSuccess(res, "success", {}, 200, true);
});

exports.updatePreSelectGroup = catchAsync(async (req, res, next) => {
  const { pgid } = req.query;

  // Validate pgid
  if (!pgid) {
    return next(new AppError("pgid missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(pgid)) {
    return next(new AppError("Invalid pgid", 400));
  }

  // Validate body
  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError("Fields missing", 400));
  }

  const updatePayload = {
    type: req.body.type,
    label: req.body.label,
    defaultValue: req.body.defaultValue,
    isRequired: req.body.isRequired,
  };
  const update = await CustomFieldGroup.findByIdAndUpdate(pgid, updatePayload, {
    new: true,
    runValidators: true,
  });

  if (!update) {
    return next(new AppError("Record not found", 404));
  }

  return sendSuccess(res, "success", update, 200, true);
});

exports.deletePreselectGroup = catchAsync(async (req, res, next) => {
  const { pgid } = req.query;
  if (!pgid) {
    return next(new AppError("pgid missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(pgid)) {
    return next(new AppError("Invaid pgid", 400));
  }
  const result = await CustomFieldGroup.findByIdAndUpdate(
    pgid,
    { isActive: false },
    { new: true, upsert: true }
  );
  if (!result) {
    return next(new AppError("Try Again Later", 400));
  }
  return sendSuccess(res, "success", {}, 201, true);
});

exports.getAllPreSelectGroup = catchAsync(async (req, res, next) => {
  const result = await CustomFieldGroup.find({ isActive: true });
  if (!result || result.length === 0) {
    return next(new AppError("not found", 400));
  }
  return sendSuccess(res, "success", result, 200, true);
});

exports.getSingleGroup = catchAsync(async (req, res, next) => {
  const { pgid } = req.query;
  if (!pgid) {
    return next(new AppError("pgid missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(pgid)) {
    return next(new AppError("Invaid pgid", 400));
  }

  const result = await CustomFieldGroup.findById(pgid);
  if (!result) {
    return next(new AppError("not found", 400));
  }
  if (!result?.isActive) {
    return next(new AppError("group not active", 400));
  }
  return sendSuccess(res, "success", result, 200, true);
});
// <-------- custom preselect group end ---------->

// <--------- worker position start ---------->

exports.addWorkerPosition = catchAsync(async (req, res, next) => {
  const { position } = req.body;
  if (!position) {
    return next(new AppError("position missing", 400));
  }
  const insert = await workerPositionModel.create(position);
  if (!insert) {
    return next(new AppError("failed to add", 400));
  }
  return sendSuccess(res, "position add successfully", {}, 200, true);
});

exports.getAllPositions = catchAsync(async (req, res, next) => {
  const result = await workerPositionModel.find({});
  if (!result || result.length === 0) {
    return next(new AppError("Position not found", 200));
  }
  return sendSuccess(res, "success", result, 200, true);
});

exports.deletePosition = catchAsync(async (req, res, next) => {
  const { wpi } = req.query;
  if (!wpi) {
    return next(new AppError("wpi missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(wpi)) {
    return next(new AppError("Invalid wpi", 400));
  }
  const result = await workerPositionModel.deleteOne({ _id: wpi });

  if (result.deletedCount === 0) {
    return next(new AppError("Worker position not found", 404));
  }
  return sendSuccess(res, "Position deleted successfully", {}, 200, true);
});

// <--------- worker position end ---------->

// <--------- custome tag start ---------->

// <-------- custome tag end

// <---------- Holidays and sickness --------->

exports.addOrUpdateHolidaySicknessSettings = catchAsync(
  async (req, res, next) => {
    const { holiday, sickness } = req.body;

    // Basic body validation
    if (!holiday && !sickness) {
      return next(new AppError("Settings data missing", 400));
    }

    // Field-level validation
    if (holiday) {
      if (holiday.monthly_limit !== undefined && holiday.monthly_limit < 0) {
        return next(
          new AppError("Holiday monthly limit cannot be negative", 400)
        );
      }
    }

    if (sickness) {
      if (sickness.monthly_limit !== undefined && sickness.monthly_limit < 0) {
        return next(
          new AppError("Sickness monthly limit cannot be negative", 400)
        );
      }
    }

    // Find existing settings (single document system)
    const existing = await HolidaySickness.findOne({});

    let result;

    if (existing) {
      // UPDATE
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
      // CREATE
      result = await HolidaySickness.create({
        holiday,
        sickness,
      });
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
