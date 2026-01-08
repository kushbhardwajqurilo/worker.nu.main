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

  if (!tenantId) {
    return next(new AppError("tenant-id missing", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("invalid tenant-id", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(admin_id)) {
    return next(new AppError("invalid admin credentials", 400));
  }

  const admin = await adminModel.findOne({ tenantId, _id: admin_id });
  if (!admin) {
    return next(new AppError("invalid admin", 400));
  }

  // ================= PAGINATION =================
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 100);
  const skip = (page - 1) * limit;

  // ================= TOTAL COUNT =================
  const totalRecords = await holidayModel.countDocuments({
    tenantId,
    isDelete: false,
  });

  // ================= FETCH DATA =================
  const result = await holidayModel
    .find({ tenantId, isDelete: false })
    .sort({ requestedDate: -1 }) // latest first (recommended)
    .skip(skip)
    .limit(limit)
    .populate({
      path: "workerId",
      select:
        "-worker_personal_details.phone -project -language -worker_holiday.sickness_holidays -worker_holiday.sickness_per_month -worker_holiday.sickness_taken -worker_economical_data -isDelete -isActive -dashboardUrl -urlVisibleToAdmin -signature -isSign -urlAdminExpireAt -personal_information.bank_details -personal_information.address_details -personal_information.close_contact -personal_information.clothing_sizes -personal_information.documents.drivers_license -personal_information.documents.passport -personal_information.documents.national_id_card -personal_information.documents.worker_work_id -personal_information.documents.other_files -createdAt -updatedAt -__v -personal_information.email -personal_information.date_of_birth",
      populate: {
        path: "worker_position",
        model: "worker_position",
        select: "_id position",
      },
    })
    .lean();

  if (!result || result.length === 0) {
    return sendSuccess(
      res,
      "holiday request found",
      {
        data: [],
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
      200,
      true
    );
  }

  // ================= STRUCTURE DATA =================
  const structuredData = result.map((item) => ({
    holiday_id: item._id,
    status: item.status,
    description: item.reason,
    requestedDate: item.requestedDate,
    approvedAt: item.approvedAt || null,

    duration: {
      startDate: item.duration.startDate,
      endDate: item.duration.endDate,
      totalDays: item.duration.totalDays,
      remaining_days: item.workerId.worker_holiday.remaining_holidays,
    },

    worker: {
      worker_id: item.workerId._id,
      worker_code: item.workerId.id,
      name: `${item.workerId.worker_personal_details?.firstName || ""} ${
        item.workerId.worker_personal_details?.lastName || ""
      }`.trim(),
      position: item.workerId.worker_position?.map((p) => p.position) || [],
      profile_picture:
        item.workerId.personal_information?.documents?.profile_picture || null,
    },
  }));

  // ================= RESPONSE =================
  return sendSuccess(
    res,
    "holiday request found",
    {
      data: structuredData,
      page,
      limit,
      total: totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
    },
    200,
    true
  );
});

// get sick leave request
exports.getSicknessRequest = catchAsync(async (req, res, next) => {
  const { admin_id, tenantId } = req;

  if (!tenantId) {
    return next(new AppError("tenant-id missing", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("invalid tenant-id", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(admin_id)) {
    return next(new AppError("invalid admin credentials", 400));
  }

  const admin = await adminModel.findOne({ tenantId, _id: admin_id });
  if (!admin) {
    return next(new AppError("invalid admin", 400));
  }

  // ================= PAGINATION =================
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 100);
  const skip = (page - 1) * limit;

  // ================= TOTAL COUNT =================
  const totalRecords = await sicknessModel.countDocuments({
    tenantId,
    isDelete: false,
  });

  // ================= FETCH DATA =================
  const result = await sicknessModel
    .find({ tenantId, isDelete: false })
    .sort({ requestedDate: -1 }) // latest first
    .skip(skip)
    .limit(limit)
    .populate({
      path: "workerId",
      select:
        "-worker_personal_details.phone -project -language -worker_holiday.remaining_holidays -worker_holiday.holidays_per_month -worker_holiday.holidays_taken -worker_economical_data -isDelete -isActive -dashboardUrl -urlVisibleToAdmin -signature -isSign -urlAdminExpireAt -personal_information.bank_details -personal_information.address_details -personal_information.close_contact -personal_information.clothing_sizes -personal_information.documents.drivers_license -personal_information.documents.passport -personal_information.documents.national_id_card -personal_information.documents.worker_work_id -personal_information.documents.other_files -createdAt -updatedAt -__v -personal_information.email -personal_information.date_of_birth",
      populate: {
        path: "worker_position",
        model: "worker_position",
        select: "_id position",
      },
    })
    .lean();

  // ================= EMPTY SAFE RESPONSE =================
  if (!result || result.length === 0) {
    return sendSuccess(
      res,
      "sickness requests found",
      {
        data: [],
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
      200,
      true
    );
  }

  // ================= STRUCTURE DATA =================
  const structuredData = result.map((item) => ({
    sickness_id: item._id,
    status: item.status,
    description: item.description || null,
    requestedDate: item.requestedDate,
    approvedAt: item.approvedAt || null,

    duration: {
      startDate: item.duration?.startDate || null,
      endDate: item.duration?.endDate || null,
      totalDays: item.duration?.totalDays || 0,
      remaining_days: item.workerId.worker_holiday.remaining_sickness,
    },

    worker: {
      worker_id: item.workerId._id,
      worker_code: item.workerId.id,
      name: `${item.workerId.worker_personal_details?.firstName || ""} ${
        item.workerId.worker_personal_details?.lastName || ""
      }`.trim(),
      position: item.workerId.worker_position?.map((p) => p.position) || [],
      profile_picture:
        item.workerId.personal_information?.documents?.profile_picture || null,
    },
  }));

  // ================= RESPONSE =================
  return sendSuccess(
    res,
    "sickness requests found",
    {
      data: structuredData,
      page,
      limit,
      total: totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
    },
    200,
    true
  );
});

// approve holiday request

exports.approveLeaveRequest = catchAsync(async (req, res, next) => {
  const { admin_id, tenantId } = req;
  if (!tenantId) {
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
    if (sickness.status === "approved") {
      return next(new AppError("sick leave request already aprroved", 400));
    }
    sickness.status = "approved";
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
    if (holidays.status === "approved") {
      return next(new AppError("holiday request already aprroved", 400));
    }
    holidays.status = "approved";
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

exports.RejectLeaveRequest = catchAsync(async (req, res, next) => {
  const { admin_id, tenantId } = req;
  if (!tenantId) {
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
    if (sickness.status === "rejected") {
      return next(new AppError("sick leave request already rejected", 400));
    }
    sickness.status = "rejected";
    sickness.approvedAt = Date.now();
    await sickness.save();

    return sendSuccess(res, "sick leave request rejected", {}, 201, true);
  } else if (leave === "holiday") {
    const holidays = await holidayModel.findOne({ tenantId, _id: l_id });
    if (!holidays) {
      return next(new AppError("holidat request not found", 400));
    }
    if (holidays.status === "rejected") {
      return next(new AppError("holiday request already reject", 400));
    }
    holidays.status = "rejected";
    holidays.approvedAt = Date.now();
    await holidays.save();

    return sendSuccess(res, "holiday request reject success", {}, 201, true);
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

// delete leave;

exports.DeleteLeaveRequest = catchAsync(async (req, res, next) => {
  const { admin_id, tenantId } = req;
  const { l_id, leave, w_id } = req.query;

  /* ---------- BASIC VALIDATIONS ---------- */
  if (!tenantId) {
    return next(new AppError("tenant-id missing", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("invalid tenant-id", 400));
  }

  if (
    !mongoose.Types.ObjectId.isValid(admin_id) ||
    !mongoose.Types.ObjectId.isValid(l_id) ||
    !mongoose.Types.ObjectId.isValid(w_id)
  ) {
    return next(new AppError("invalid credentials", 400));
  }

  if (!leave || !["sickness", "holiday"].includes(leave)) {
    return next(new AppError("invalid leave type", 400));
  }

  /* ---------- CHECK WORKER ---------- */
  const worker = await workerModel.findOne({
    tenantId,
    _id: w_id,
    isDelete: false,
    isActive: true,
  });

  if (!worker) {
    return next(new AppError("worker not found or inactive", 400));
  }

  /* ---------- DELETE LEAVE ---------- */
  let leaveDoc;

  if (leave === "sickness") {
    leaveDoc = await sicknessModel.findOne({
      tenantId,
      _id: l_id,
      workerId: w_id,
    });

    if (!leaveDoc) {
      return next(new AppError("sickness request not found", 404));
    }

    if (leaveDoc.isDelete === true) {
      return next(new AppError("sickness request already deleted", 400));
    }

    leaveDoc.isDelete = true;
    await leaveDoc.save();

    return sendSuccess(
      res,
      "Sickness leave deleted successfully",
      {},
      200,
      true
    );
  }

  if (leave === "holiday") {
    leaveDoc = await holidayModel.findOne({
      tenantId,
      _id: l_id,
      workerId: w_id,
    });

    if (!leaveDoc) {
      return next(new AppError("holiday request not found", 404));
    }

    if (leaveDoc.isDelete === true) {
      return next(new AppError("holiday request already deleted", 400));
    }

    leaveDoc.isDelete = true;
    await leaveDoc.save();

    return sendSuccess(
      res,
      "Holiday leave deleted successfully",
      {},
      200,
      true
    );
  }
});

exports.getApproveLeaves = catchAsync(async (req, res, next) => {
  const { admin_id, tenantId } = req;
  const { type } = req.query;

  /* ---------- BASIC VALIDATION ---------- */
  if (!tenantId) {
    return next(new AppError("tenant-id missing", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("invalid tenant-id", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(admin_id)) {
    return next(new AppError("invalid admin credentials", 400));
  }

  if (!type || !["holiday", "sickness"].includes(type)) {
    return next(new AppError("invalid leave type", 400));
  }

  const admin = await adminModel.findOne({ tenantId, _id: admin_id });
  if (!admin) {
    return next(new AppError("invalid admin", 400));
  }

  /* ---------- PAGINATION ---------- */
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 100);
  const skip = (page - 1) * limit;

  /* ---------- CONFIG BASED ON TYPE ---------- */
  const config = {
    holiday: {
      model: holidayModel,
      idKey: "holiday_id",
      message: "holiday requests found",
      remainingKey: "remaining_holidays",
      descriptionKey: "reason",
    },
    sickness: {
      model: sicknessModel,
      idKey: "sickness_id",
      message: "sickness requests found",
      remainingKey: "remaining_sickness",
      descriptionKey: "description",
    },
  }[type];

  /* ---------- QUERY (APPROVED ONLY) ---------- */
  const query = {
    tenantId,
    isDelete: false,
    status: "approved",
  };

  /* ---------- TOTAL COUNT ---------- */
  const totalRecords = await config.model.countDocuments(query);

  /* ---------- FETCH DATA ---------- */
  const result = await config.model
    .find(query)
    .sort({ requestedDate: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "workerId",
      select:
        "-worker_personal_details.phone -project -language -worker_economical_data -isDelete -isActive -dashboardUrl -urlVisibleToAdmin -signature -isSign -urlAdminExpireAt -personal_information.bank_details -personal_information.address_details -personal_information.close_contact -personal_information.clothing_sizes -personal_information.documents.drivers_license -personal_information.documents.passport -personal_information.documents.national_id_card -personal_information.documents.worker_work_id -personal_information.documents.other_files -createdAt -updatedAt -__v -personal_information.email -personal_information.date_of_birth",
      populate: {
        path: "worker_position",
        model: "worker_position",
        select: "_id position",
      },
    })
    .lean();

  /* ---------- EMPTY SAFE RESPONSE ---------- */
  if (!result.length) {
    return sendSuccess(
      res,
      config.message,
      {
        data: [],
        page,
        limit,
        total: totalRecords,
        type: type,
        totalPages: Math.ceil(totalRecords / limit),
      },
      200,
      true
    );
  }

  /* ---------- STRUCTURE DATA ---------- */
  const structuredData = result.map((item) => ({
    [config.idKey]: item._id,
    status: item.status,
    description: item[config.descriptionKey] || null,
    requestedDate: item.requestedDate,
    approvedAt: item.approvedAt || null,

    duration: {
      startDate: item.duration?.startDate || null,
      endDate: item.duration?.endDate || null,
      totalDays: item.duration?.totalDays || 0,
      remaining_days: item.workerId.worker_holiday?.[config.remainingKey] ?? 0,
    },

    worker: {
      worker_id: item.workerId._id,
      worker_code: item.workerId.id,
      name: `${item.workerId.worker_personal_details?.firstName || ""} ${
        item.workerId.worker_personal_details?.lastName || ""
      }`.trim(),
      position: item.workerId.worker_position?.map((p) => p.position) || [],
      profile_picture:
        item.workerId.personal_information?.documents?.profile_picture || null,
    },
  }));

  /* ---------- RESPONSE ---------- */
  return sendSuccess(
    res,
    config.message,
    {
      data: structuredData,
      page,
      limit,
      type,
      total: totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
    },
    200,
    true
  );
});
