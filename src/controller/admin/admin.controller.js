const { default: mongoose } = require("mongoose");
const cron = require("node-cron");
const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");
const { holidayModel, sicknessModel } = require("../../models/leavesModel");
const adminModel = require("../../models/authmodel/adminModel");
const { workerModel } = require("../../models/workerModel");

const projectMode = require("../../models/projectMode");
const { WorkerReminder } = require("../../models/reminder.model");
const { isValidCustomUUID } = require("custom-uuid-generator");

//get leaves for admin
exports.getHolidayRequest = catchAsync(async (req, res, next) => {
  const { admin_id, tenantId } = req;
  if (tenantId) {
    return next(new AppError("tenant-id missing", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("invalid tenant-id", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(admin_id)) {
    return next("invalid admin credentials");
  }

  const admin = await adminModel.findOne({ tenantId, _idadmin_id });
  if (!admin) {
    return next(new AppError("invalid admin", 400));
  }
  const result = await holidayModel.find({ tenantId, status: "pending" });
  if (!result) {
    return next(new AppError("now holiday request found.", 400));
  }
  return sendSuccess(res, "holiday request found", result, 200, true);
});

// get sick leave request
exports.getSicknessRequest = catchAsync(async (req, res, next) => {
  const { admin_id, tenantId } = req;
  if (tenantId) {
    return next(new AppError("tenant-id missing", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("invalid tenant-id", 400));
  }
  const admin = await adminModel.findOne({ tenantId, _id: admin_id });
  if (!admin) {
    return next(new AppError("invalid admin", 400));
  }
  const result = await sicknessModel.find({ tenantId, status: "pending" });
  if (!result) {
    return next(new AppError("sickness request found.", 400));
  }
  return sendSuccess(res, "sickeness requests found", result, 200, true);
});

// approve holiday request

exports.approveLeaveRequest = catchAsync(async (req, res, next) => {
  const { admin_id, tenantId } = req;
  if (tenantId) {
    return next(new AppError("tenant-id missing", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("invalid tenant-id", 400));
  }
  const { l_id, leave, w_id } = req.query;
  if (
    !mongoose.Types.ObjectId.isValid(admin_id) ||
    !mongoose.Types.ObjectId.isValid(l_id) ||
    !mongoose.Types.ObjectId.isValid(w_id)
  ) {
    return next(new AppError("invalid credentials", 400));
  }
  if (!leave) {
    return next(new AppError("leave type missing", 400));
  }
  //   check valid worker
  const worker = await workerModel.findOne({ tenantId, _id: w_id });
  if (!worker) {
    return next(new AppError("Invalid Worker", 400));
  }
  if (worker.isActive === false || worker.isDelete) {
    return next(new AppError("worker not active", 400));
  }

  //   check  for leave
  if (leave === "sickness") {
    const sickness = await sicknessModel.findOne({ tenantId, _id: l_id });
    if (!sickness) {
      return next(new AppError("sickness request not found", 400));
    }
    if (sickness.status === "approve") {
      return next(new AppError("sick leave request already aprroved", 400));
    }
    sickness.status = "approve";
    sickness.approvedAt = Date.now();
    await sickness.save();

    // days deduction
    worker.worker_holiday.remaining_sickness =
      worker.worker_holiday.remaining_sickness - 1;

    worker.worker_holiday.sickness_taken =
      worker.worker_holiday.sickness_taken + 1;
    await worker.save();
    return sendSuccess(res, "sick leave request approved", {}, 201, true);
  } else if (leave === "holiday") {
    const holidays = await holidayModel.findOne({ tenantId, _id: l_id });
    if (!holidays) {
      return next(new AppError("holidat request not found", 400));
    }
    if (holidays.status === "approve") {
      return next(new AppError("holiday request already aprroved", 400));
    }
    holidays.status = "approve";
    holidays.approvedAt = Date.now();
    await holidays.save();

    // days deduction
    worker.worker_holiday.remaining_holidays =
      worker.worker_holiday.remaining_holidays - 1;

    worker.worker_holiday.holidays_taken =
      worker.worker_holiday.holidays_taken + 1;

    await worker.save();
    return sendSuccess(res, "holiday request approved", {}, 201, true);
  } else {
    return next(new AppError("Invalid Request Type", 400));
  }
});

// <-------------- REMINDERS ----------->
exports.setProjectReminder = catchAsync(async (req, res, next) => {
  const requiredField = ["title", "note", "date", "reminderFor"];
  for (let fields of requiredField) {
    if (
      !req.body[fields] ||
      req.body[fields].toString().trim().length === 0 ||
      req.body[fields] == undefined
    ) {
      return next(new AppError(`${fields} missing.`, 400));
    }
  }
  const reminderPayload = {
    title: req.body.title,
    note: req.body.note,
    date: req.body.date,
    project: req.body.project || null,
  };

  if (req.body.reminderFor === "worker") {
    reminderPayload["reminderFor"] = req.body.reminderFor;
    reminderPayload["workerId"] = req.body.worker;
  }
  if (req.body.reminderFor === "manager") {
    reminderPayload["reminderFor"] = req.body.reminderFor;
    reminderPayload["manager"] = req.body.manager;
  }
  if (req.body.reminderFor === "both") {
    reminderPayload["reminderFor"] = req.body.reminderFor;
    reminderPayload["workerId"] = req.body.worker;
    reminderPayload["manager"] = req.body.manager;
  }
  const reminder = await WorkerReminder.create(reminderPayload);
  if (!reminder) {
    return next(new AppError("Try again later", 400));
  }
  return sendSuccess(res, "Reminder Set Successfully", {}, 200, true);
});

// <-------- Edit Reminder -------->
exports.editReminder = catchAsync(async (req, res, next) => {
  const { admin_id } = req;
  const { r_id } = req.query;

  // ===== BASIC VALIDATION =====
  if (!admin_id) {
    return next(new AppError("Admin Credential Missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(admin_id)) {
    return next(new AppError("Invalid Admin Credential", 400));
  }

  if (!r_id) {
    return next(new AppError("Reminder ID Missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(r_id)) {
    return next(new AppError("Invalid Reminder ID", 400));
  }

  // ===== FIND REMINDER (NOT SENT ONLY) =====
  const reminder = await WorkerReminder.findOne({
    _id: r_id,
  });

  if (!reminder) {
    return next(new AppError("No reminder found or already sent", 404));
  }
  if (reminder.isSent) {
    return next(
      new AppError(
        "Cannot edit reminder because it has already been sent.",
        200
      )
    );
  }
  // ===== BUILD UPDATE PAYLOAD =====
  const reminderPayload = {
    title: req.body.title,
    note: req.body.note,
    date: req.body.date,
    project: req.body.project,
    reminderFor: req.body.reminderFor,
  };

  if (req.body.reminderFor === "worker") {
    reminderPayload.workerId = req.body.worker;
    reminderPayload.manager = undefined;
  }

  if (req.body.reminderFor === "manager") {
    reminderPayload.manager = req.body.manager;
    reminderPayload.workerId = undefined;
  }

  if (req.body.reminderFor === "both") {
    reminderPayload.workerId = req.body.worker;
    reminderPayload.manager = req.body.manager;
  }

  // ===== UPDATE =====
  await WorkerReminder.updateOne({ _id: r_id }, { $set: reminderPayload });

  return sendSuccess(res, "Reminder edited successfully", {}, 200, true);
});

// <--------- delete reminder ----------->
exports.deleteReminder = catchAsync(async (req, res, next) => {
  const { admin_id } = req;
  const { r_id } = req.query;
  if (!admin_id || admin_id.length === 0) {
    return next(new AppError("Admin Credential Missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(admin_id)) {
    return next(new AppError("Invalid Admin Credential", 400));
  }
  if (!r_id) {
    return next(new AppError("Reminder ID Missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(r_id)) {
    return next(new AppError("Invalid Reminder ID", 400));
  }
  const query = await WorkerReminder.deleteOne({ _id: r_id });
  if (query.deletedCount === 0) {
    return next(new AppError("failed to delete", 400));
  }
  return sendSuccess(res, "Reminder Delete Successfully", {}, 201, true);
});
