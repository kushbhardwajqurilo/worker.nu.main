const mongoose = require("mongoose");
const WorkerHours = require("../../models/hoursModel");
const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");
const hoursModel = require("../../models/hoursModel");

// Create Worker Hours
exports.createWorkerHours = catchAsync(async (req, res, next) => {
  const {
    project,
    day_off,
    start_working_hours,
    finish_hours,
    break_time,
    comments,
    image,
    workerId,
  } = req.body;

  // --------------------------------
  // 1. REQUIRED VALIDATION
  // --------------------------------
  if (!project || !project.projectId || !project.project_date) {
    return next(new AppError("Project details missing", 400));
  }

  if (!comments || !image) {
    return next(new AppError("Comments & image required", 400));
  }

  if (!start_working_hours || !finish_hours) {
    return next(new AppError("Start & finish working hours required", 400));
  }

  // --------------------------------
  // 2. EXTRACT WORKING HOURS
  // --------------------------------
  const { hours: sh, minutes: sm } = start_working_hours;
  const { hours: fh, minutes: fm } = finish_hours;

  // Range validations
  if (sh < 0 || sh > 23 || fh < 0 || fh > 23) {
    return next(new AppError("Hours must be between 0 - 23", 400));
  }

  if (sm < 0 || sm > 59 || fm < 0 || fm > 59) {
    return next(new AppError("Minutes must be between 0 - 59", 400));
  }

  // Compare time
  const startTotal = sh * 60 + sm;
  const finishTotal = fh * 60 + fm;

  if (finishTotal <= startTotal) {
    return next(
      new AppError("Finish time must be greater than start time", 400)
    );
  }

  // --------------------------------
  // 3. SAVE DOCUMENT
  // --------------------------------
  const payload = {
    project,
    day_off: day_off || false,
    start_working_hours: {
      hours: start_working_hours.sh,
      minutes: start_working_hours.sm,
    },
    finish_hours: {
      hours: finish_hours.fh,
      minutes: finish_hours.fm,
    },
    break_time,
    comments,
    image,
    workerId,
  };

  const newRecord = await WorkerHours.create(payload);

  return sendSuccess(res, "hours add successfull", {}, 200, true);
});

// update hours
exports.updateWorkerHours = catchAsync(async (req, res, next) => {
  const { workerId } = req.body; // or req.body / req.params

  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError("update hours data missing", 400));
  }

  if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
    return next(new AppError("worker identification details missing", 400));
  }

  const updatedWorkerHours = await hoursModel.findOneAndUpdate(
    { workerId: workerId },
    req.body,
    { new: true, runValidators: true }
  );

  if (!updatedWorkerHours) {
    return next(
      new AppError("failed to update hours or worker not found", 400)
    );
  }

  return sendSuccess(res, "hours updated successfully", {}, 200, true);
});

// <------- get single hours details -------->

exports.getSingleHoursDetailsController = catchAsync(async (req, res, next) => {
  const { h_id } = req.query; // h_id means hour ObjectId
  if (!h_id || h_id.length === 0) {
    return next(new AppError("hours credentials Missing", 400));
  }
  const result = await hoursModel.findById(h_id);
  if (!result || result.length === 0) {
    return next(AppError("failed to found hours", 400));
  }
  return sendSuccess(res, "", result, 200, true);
});

// <------- get single hours details end ------->

// <------- get all hours of each worker -------->

exports.getAllHoursOfWorkerController = catchAsync(async (req, res, next) => {
  const { w_id } = req.query; // w_id means worker Object
  if (!w_id || w_id.length === 0) {
    return next(new AppError("w_id missing", 400));
  }
  const result = await hoursModel.find({ workerId: w_id });
  if (!result || result.length === 0) {
    return next(new AppError("Unable to fatch hours."));
  }
  return sendSuccess(res, "success", result, 200, true);
});

// <------- get all hours of each worker End ---------->
