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
const { WorkerReminder, Notification } = require("../../models/reminder.model");
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

  const query = {
    tenantId,
    isDelete: false,
  };
  const { w_id } = req.body; // array workerIds
  let workerObjectIds = [];
  if (Array.isArray(w_id) && w_id.length > 0) {
    workerObjectIds = w_id.map((id) => new mongoose.Types.ObjectId(id));
    query.workerId = { $in: workerObjectIds };
  }
  if (req.body?.date) {
    const inputDate = new Date(req.body.date);

    const year = inputDate.getFullYear();
    const month = inputDate.getMonth();
    const day = inputDate.getDate();

    const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

    query["duration.startDate"] = { $lte: endOfDay };
    query["duration.endDate"] = { $gte: startOfDay };
  }
  // ================= TOTAL COUNT =================
  const totalRecords = await holidayModel.countDocuments(query);

  // ================= FETCH DATA =================
  const result = await holidayModel
    .find(query)
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
      true,
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
    true,
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

  const { w_id } = req.body;
  // ================= PAGINATION =================
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 100);
  const skip = (page - 1) * limit;

  const query = {
    tenantId,
    isDelete: false,
  };
  let workerObjectIds = [];
  if (Array.isArray(w_id) && w_id.length > 0) {
    workerObjectIds = w_id.map((id) => new mongoose.Types.ObjectId(id));
    query.workerId = { $in: workerObjectIds };
  }
  if (req.body?.date) {
    const inputDate = new Date(req.body.date);

    const year = inputDate.getFullYear();
    const month = inputDate.getMonth();
    const day = inputDate.getDate();

    const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

    query["duration.startDate"] = { $lte: endOfDay };
    query["duration.endDate"] = { $gte: startOfDay };
  }

  // ================= TOTAL COUNT =================
  const totalRecords = await sicknessModel.countDocuments(query);

  // ================= FETCH DATA =================
  const result = await sicknessModel
    .find(query)
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
      true,
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
    true,
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
  const { l_id, leave, w_id, duration } = req.query;
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
    const notificationPayload = {
      tenantId,
      userId: w_id,
      title: `Your ${leave} has been Approved`,
      message: `${duration}`,
      type: "INFO",
    };
    const ress = await Notification.create(notificationPayload);
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
  const { l_id, leave, w_id, duration } = req.query;
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
    const notificationPayload = {
      tenantId,
      userId: w_id,
      title: `Your ${leave} has been Rejected`,
      message: `${duration}`,
      type: "INFO",
    };
    const ress = await Notification.create(notificationPayload);
    return sendSuccess(res, "holiday request reject success", {}, 201, true);
  } else {
    return next(new AppError("Invalid Request Type", 400));
  }
});
// <-------------- REMINDERS ----------->
function formatDateDDMMYYYY(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

// exports.getReminders = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;

//   if (!tenantId) {
//     return next(new AppError("tenant-id missing", 400));
//   }

//   if (!isValidCustomUUID(tenantId)) {
//     return next(new AppError("Invalid Tenant-id", 400));
//   }

//   // ================= PAGINATION =================
//   const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
//   const limit =
//     Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;

//   const skip = (page - 1) * limit;

//   // ================= TOTAL COUNT =================
//   const totalReminders = await WorkerReminder.countDocuments({ tenantId });

//   // ================= FETCH DATA =================
//   const reminders = await WorkerReminder.find({ tenantId })
//     .populate({
//       path: "project",
//       select: "project_details.project_name",
//     })
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(limit)
//     .lean();

//   if (!reminders.length) {
//     return sendSuccess(
//       res,
//       "no reminder found",
//       {
//         total: 0,
//         page,
//         limit,
//         totalPages: 0,
//         reminders: [],
//       },
//       200,
//       true,
//     );
//   }

//   // ================= FORMAT RESPONSE =================
//   const formattedData = reminders.map((val, pos) => ({
//     s_no: skip + pos + 1,
//     _id: val._id,
//     date: formatDateDDMMYYYY(val.date),
//     title: val.title,
//     reminderFor: val.reminderFor,
//     notes: val.note,
//     isSent: val.isSent,
//     project: val.project?.map((p) => ({
//       _id: p._id,
//       project_name: p.project_details.project_name,
//     })),
//   }));

//   return sendSuccess(
//     res,
//     "reminder fetched successfully",
//     {
//       total: totalReminders,
//       page,
//       limit,
//       totalPages: Math.ceil(totalReminders / limit),
//       reminders: formattedData,
//     },
//     200,
//     true,
//   );
// });

exports.getReminders = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("tenant-id missing", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }

  const { w_id } = req.body; // OPTIONAL (array)

  // ================= PAGINATION =================
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit =
    Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;

  const skip = (page - 1) * limit;

  // ================= BASE QUERY =================
  const query = { tenantId };

  // ✅ Apply workerId filter ONLY if w_id is provided
  let workerObjectIds = [];
  if (Array.isArray(w_id) && w_id.length > 0) {
    workerObjectIds = w_id.map((id) => new mongoose.Types.ObjectId(id));
    query.workerId = { $in: workerObjectIds };
  }

  // ================= TOTAL COUNT =================
  const totalReminders = await WorkerReminder.countDocuments(query);

  // ================= FETCH DATA =================
  const reminders = await WorkerReminder.find(query)
    .populate({
      path: "project",
      select: "project_details.project_name",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  if (!reminders.length) {
    return sendSuccess(
      res,
      "no reminder found",
      {
        total: 0,
        page,
        limit,
        totalPages: 0,
        reminders: [],
      },
      200,
      true,
    );
  }

  // ================= FORMAT RESPONSE =================
  const formattedData = reminders.map((val, pos) => {
    let filteredWorkerId = val.workerId;

    // ✅ Trim workerId array ONLY when filter applied
    if (workerObjectIds.length > 0) {
      filteredWorkerId = val.workerId.filter((id) =>
        workerObjectIds.some((wid) => wid.toString() === id.toString()),
      );
    }

    return {
      s_no: skip + pos + 1,
      _id: val._id,
      date: formatDateDDMMYYYY(val.date),
      title: val.title,
      reminderFor: val.reminderFor,
      notes: val.note,
      isSent: val.isSent,
      workerId: filteredWorkerId, // 👈 sirf matched ya full
      project: val.project?.map((p) => ({
        _id: p._id,
        project_name: p.project_details.project_name,
      })),
    };
  });

  return sendSuccess(
    res,
    "reminder fetched successfully",
    {
      total: totalReminders,
      page,
      limit,
      totalPages: Math.ceil(totalReminders / limit),
      reminders: formattedData,
    },
    200,
    true,
  );
});

exports.setProjectReminder = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  /* ---------- TENANT VALIDATION ---------- */
  if (!tenantId) {
    return next(new AppError("tenant-id missing", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid tenant-id", 400));
  }

  const {
    title,
    note,
    date,
    reminderFor,
    workerId,
    worker, // backward compatibility
    project,
  } = req.body;

  /* ---------- BASIC VALIDATION ---------- */
  if (!title?.trim()) return next(new AppError("title missing", 400));
  if (!note?.trim()) return next(new AppError("note missing", 400));
  if (!date) return next(new AppError("date missing", 400));
  if (!reminderFor) return next(new AppError("reminderFor missing", 400));

  /* ---------- NORMALIZE ARRAYS ---------- */
  const workers = Array.isArray(workerId)
    ? workerId
    : Array.isArray(worker)
      ? worker
      : [];

  const projects = Array.isArray(project) ? project : [];

  const hasWorker = workers.length > 0;
  const hasProject = projects.length > 0;

  /* ---------- STRICT VALIDATION (NEW RULES) ---------- */

  // manager → nothing allowed
  if (reminderFor === "manager") {
    if (hasWorker || hasProject) {
      return next(
        new AppError("Manager reminder should not have worker or project", 400),
      );
    }
  }

  // worker → worker required, project not allowed
  if (reminderFor === "worker") {
    if (!hasWorker) {
      return next(new AppError("Worker is required", 400));
    }
    if (hasProject) {
      return next(new AppError("Project not allowed for worker reminder", 400));
    }
  }

  // project → project required, worker not allowed
  if (reminderFor === "project") {
    if (!hasProject) {
      return next(new AppError("Project is required", 400));
    }
    if (hasWorker) {
      return next(new AppError("Worker not allowed for project reminder", 400));
    }
  }

  // both → worker required, project optional
  if (reminderFor === "both") {
    if (!hasWorker) {
      return next(new AppError("Worker is required for both reminder", 400));
    }
  }

  /* ---------- BUILD PAYLOAD ---------- */
  const reminderPayload = {
    tenantId,
    title: title.trim(),
    note: note.trim(),
    date,
    reminderFor,
    workerId: workers, // empty array allowed only for manager/project
    project: projects, // empty array allowed except project type
  };

  // notification paylod
  let notificationPayload = [];
  if (Array.isArray(worker)) {
    worker.map((val, pos) => {
      notificationPayload.push({
        tenantId,
        title: title.trim(),
        message: note.trim(),
        userId: new mongoose.Types.ObjectId(val),
        type: "SUCCESS",
      });
    });
  }
  const reminder = await WorkerReminder.create(reminderPayload);
  if (!reminder) {
    return next(new AppError("new reminders not founds", 400));
  }
  const setNotification = await Notification.insertMany(notificationPayload);
  return sendSuccess(res, "Reminder set successfully", {}, 201, true);
});

// <-------- Edit Reminder -------->
exports.editReminder = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { r_id } = req.query;

  /* ---------- TENANT VALIDATION ---------- */
  if (!tenantId) {
    return next(new AppError("tenant-id missing", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid tenant-id", 400));
  }

  if (!r_id || !mongoose.Types.ObjectId.isValid(r_id)) {
    return next(new AppError("Invalid reminder id", 400));
  }

  /* ---------- FIND REMINDER ---------- */
  const reminder = await WorkerReminder.findOne({ _id: r_id, tenantId });

  if (!reminder) {
    return next(new AppError("Reminder not found", 404));
  }

  if (reminder.isSent) {
    return next(new AppError("Cannot edit reminder after it is sent", 400));
  }

  const {
    title,
    note,
    date,
    reminderFor,
    workerId,
    worker, // backward compatibility
    project,
  } = req.body;

  /* ---------- NORMALIZE ARRAYS ---------- */
  const workers = Array.isArray(workerId)
    ? workerId
    : Array.isArray(worker)
      ? worker
      : reminder.workerId || [];

  const projects = Array.isArray(project) ? project : reminder.project || [];

  const finalReminderFor = reminderFor || reminder.reminderFor;

  const hasWorker = workers.length > 0;
  const hasProject = projects.length > 0;

  /* ---------- STRICT VALIDATION (SAME AS SET) ---------- */

  // manager → nothing allowed
  if (finalReminderFor === "manager") {
    if (hasWorker || hasProject) {
      return next(
        new AppError("Manager reminder should not have worker or project", 400),
      );
    }
  }

  // worker → worker required, project not allowed
  if (finalReminderFor === "worker") {
    if (!hasWorker) {
      return next(new AppError("Worker is required", 400));
    }
    if (hasProject) {
      return next(new AppError("Project not allowed for worker reminder", 400));
    }
  }

  // project → project required, worker not allowed
  if (finalReminderFor === "project") {
    if (!hasProject) {
      return next(new AppError("Project is required", 400));
    }
    if (hasWorker) {
      return next(new AppError("Worker not allowed for project reminder", 400));
    }
  }

  // both → worker required, project optional
  if (finalReminderFor === "both") {
    if (!hasWorker) {
      return next(new AppError("Worker is required for both reminder", 400));
    }
  }

  /* ---------- BUILD UPDATE PAYLOAD ---------- */
  const updatePayload = {};

  if (title) updatePayload.title = title.trim();
  if (note) updatePayload.note = note.trim();
  if (date) updatePayload.date = date;
  if (reminderFor) updatePayload.reminderFor = reminderFor;

  updatePayload.workerId = workers;
  updatePayload.project = projects;

  const updatedReminder = await WorkerReminder.findOneAndUpdate(
    { _id: r_id, tenantId },
    { $set: updatePayload },
    { new: true },
  );

  return sendSuccess(res, "Reminder updated successfully", {}, 200, true);
});

// get single reminder
exports.getSingleReminder = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { r_id } = req.query;
  /* ---------- VALIDATION ---------- */
  if (!tenantId) {
    return next(new AppError("tenant-id missing", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid tenant-id", 400));
  }

  if (!r_id || !mongoose.Types.ObjectId.isValid(r_id)) {
    return next(new AppError("Invalid reminder id", 400));
  }
  const reminder = await WorkerReminder.findOne({
    _id: r_id,
    tenantId,
  });
  if (!reminder) {
    return next(new AppError("reminder not found", 400));
  }

  return sendSuccess(res, "data found", [reminder], 200, true);
});
// <--------- delete reminder ----------->
exports.deleteReminder = catchAsync(async (req, res, next) => {
  const { admin_id, tenantId } = req;
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
  const query = await WorkerReminder.deleteOne({ _id: r_id, tenantId });
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
      true,
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
      true,
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

  let workerObjectIds = [];
  if (Array.isArray() && req.body?.w_id && req.body?.w_id.length > 0) {
    workerObjectIds = w_id.map((id) => new mongoose.Types.ObjectId(id));
    query.workerId = { $in: workerObjectIds };
  }
  if (req.body?.date) {
    const inputDate = new Date(req.body.date.split(",")[0]);
    const startDate = new Date(inputDate);
    startDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(inputDate);
    endOfDay.setHours(23, 59, 59, 999);

    query.requestedDate = {
      $gte: startDate,
      $lte: endOfDay,
    };
  }
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
      true,
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
    true,
  );
});

// < ----------------- Sickness and holiday filter ----------------->
// filter by worker and date

exports.LeaveFilterController = catchAsync(async (req, res, next) => {
  const { w_id, date } = req.body;
  const wid = [...w_id];

  // const
});

// < ------- remnder filter ----------->
exports.reminderFilter = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("tenant missing", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant", 400));
  }

  const { w_id } = req.body; // array of workerIds

  if (!Array.isArray(w_id) || w_id.length === 0) {
    return next(new AppError("workerId array required", 400));
  }

  // convert string ids to ObjectId
  const workerIds = w_id.map((id) => new mongoose.Types.ObjectId(id));

  const data = await WorkerReminder.aggregate([
    {
      $match: {
        tenantId,
        workerId: { $in: workerIds },
      },
    },
    {
      $project: {
        tenantId: 1,
        title: 1,
        date: 1,
        reminderFor: 1,
        note: 1,
        isSent: 1,
        project: 1,
        createdAt: 1,
        updatedAt: 1,
        workerId: {
          $filter: {
            input: "$workerId",
            as: "wid",
            cond: {
              $in: ["$$wid", workerIds],
            },
          },
        },
      },
    },
  ]);

  if (!data || data.length === 0) {
    return sendSuccess(res, "reminder not found", [], 200, true);
  }

  return sendSuccess(res, "success", data, 200, true);
});
