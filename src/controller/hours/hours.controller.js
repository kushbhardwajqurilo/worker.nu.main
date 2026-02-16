// const mongoose = require("mongoose");
// const WorkerHours = require("../../models/hoursModel");
// const {
//   catchAsync,
//   AppError,
//   sendSuccess,
// } = require("../../utils/errorHandler");
// const hoursModel = require("../../models/hoursModel");

// // Create Worker Hours
// exports.createWorkerHours = catchAsync(async (req, res, next) => {
//   const {
//     project,
//     day_off,
//     start_working_hours,
//     finish_hours,
//     break_time,
//     comments,
//     image,
//     workerId,
//   } = req.body;

//   // --------------------------------
//   // 1. REQUIRED VALIDATION
//   // --------------------------------
//   if (!project || !project.projectId || !project.project_date) {
//     return next(new AppError("Project details missing", 400));
//   }

//   if (!comments || !image) {
//     return next(new AppError("Comments & image required", 400));
//   }

//   if (!start_working_hours || !finish_hours) {
//     return next(new AppError("Start & finish working hours required", 400));
//   }

//   // --------------------------------
//   // 2. EXTRACT WORKING HOURS
//   // --------------------------------
//   const { hours: sh, minutes: sm } = start_working_hours;
//   const { hours: fh, minutes: fm } = finish_hours;

//   // Range validations
//   if (sh < 0 || sh > 23 || fh < 0 || fh > 23) {
//     return next(new AppError("Hours must be between 0 - 23", 400));
//   }

//   if (sm < 0 || sm > 59 || fm < 0 || fm > 59) {
//     return next(new AppError("Minutes must be between 0 - 59", 400));
//   }

//   // Compare time
//   const startTotal = sh * 60 + sm;
//   const finishTotal = fh * 60 + fm;

//   if (finishTotal <= startTotal) {
//     return next(
//       new AppError("Finish time must be greater than start time", 400)
//     );
//   }

//   // --------------------------------
//   // 3. SAVE DOCUMENT
//   // --------------------------------
//   const payload = {
//     project,
//     day_off: day_off || false,
//     start_working_hours: {
//       hours: start_working_hours.sh,
//       minutes: start_working_hours.sm,
//     },
//     finish_hours: {
//       hours: finish_hours.fh,
//       minutes: finish_hours.fm,
//     },
//     break_time,
//     comments,
//     image,
//     workerId,
//   };

//   const newRecord = await WorkerHours.create(payload);

//   return sendSuccess(res, "hours add successfull", {}, 200, true);
// });

// // update hours
// exports.updateWorkerHours = catchAsync(async (req, res, next) => {
//   const { workerId } = req.body; // or req.body / req.params

//   if (!req.body || Object.keys(req.body).length === 0) {
//     return next(new AppError("update hours data missing", 400));
//   }

//   if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
//     return next(new AppError("worker identification details missing", 400));
//   }

//   const updatedWorkerHours = await hoursModel.findOneAndUpdate(
//     { workerId: workerId },
//     req.body,
//     { new: true, runValidators: true }
//   );

//   if (!updatedWorkerHours) {
//     return next(
//       new AppError("failed to update hours or worker not found", 400)
//     );
//   }

//   return sendSuccess(res, "hours updated successfully", {}, 200, true);
// });

// // <------- get single hours details -------->

// exports.getSingleHoursDetailsController = catchAsync(async (req, res, next) => {
//   const { h_id } = req.query; // h_id means hour ObjectId
//   if (!h_id || h_id.length === 0) {
//     return next(new AppError("hours credentials Missing", 400));
//   }
//   const result = await hoursModel.findById(h_id);
//   if (!result || result.length === 0) {
//     return next(AppError("failed to found hours", 400));
//   }
//   return sendSuccess(res, "", result, 200, true);
// });

// // <------- get single hours details end ------->

// // <------- get all hours of each worker -------->

// exports.getAllHoursOfWorkerController = catchAsync(async (req, res, next) => {
//   const { w_id } = req.query; // w_id means worker Object
//   if (!w_id || w_id.length === 0) {
//     return next(new AppError("w_id missing", 400));
//   }
//   const result = await hoursModel.find({ workerId: w_id });
//   if (!result || result.length === 0) {
//     return next(new AppError("Unable to fatch hours."));
//   }
//   return sendSuccess(res, "success", result, 200, true);
// });

// // <------- get all hours of each worker End ---------->
const mongoose = require("mongoose");
const hoursModel = require("../../models/hoursModel");
const {} = require("../../models/projectMode");
const {
  AppError,
  sendSuccess,
  catchAsync,
} = require("../../utils/errorHandler");
const {
  getMonthRange,
  calculatePercentage,
  getTotalHours,
  getActiveWorkerIds,
  getActiveProjectIds,
} = require("../../utils/utils");
const projectMode = require("../../models/projectMode");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { isValidCustomUUID } = require("custom-uuid-generator");
const calculateLateByProjectEnd = require("../../utils/calculateLate");
const calculateLateHoursByDate = require("../../utils/weekLateCount");
const generateTimesheetPDFBuffer = require("../../utils/generateTimeSheetPdf");
const clientModel = require("../../models/clientModel");
const adminModel = require("../../models/authmodel/adminModel");
const calculateEvaluation = require("../../utils/calculateEvaluation");
const getWeeksSinceCreated = require("../../utils/calculateWeekNo");
const getWeeksCreated = require("../../utils/week");

exports.createWorkerHours = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  console.log(req.role);
  const files = req.files || []; // 👈 .any() → always array

  /* ---------- FILE LIMIT CHECK ---------- */
  if (files.length > 5) {
    return next(new AppError("Maximum 5 images allowed", 400));
  }

  let {
    project,
    day_off,
    start_working_hours,
    finish_hours,
    break_time,
    comments,
    workerId,
    lateReason,
  } = req.body;

  if (req.role === "worker") {
    workerId = req.worker_id;
  } else {
    workerId = workerId;
  }

  /* ---------- SAFE JSON PARSE ---------- */
  const safeParse = (value) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (err) {
        throw new AppError("Invalid JSON format", 400);
      }
    }
    return value;
  };

  const parsedProject = safeParse(project);
  if (parsedProject.project_date) {
    const [day, month, year] = parsedProject.project_date.split("/");
    parsedProject.project_date = new Date(Date.UTC(year, month - 1, day));
  }
  const parsedStartHours = safeParse(start_working_hours);
  const parsedFinishHours = safeParse(finish_hours);
  const parseComments = safeParse(comments);
  const parsedWorkerId =
    req.role === "worker" ? req.worker_id : safeParse(workerId);
  const breakTime =
    break_time === "undefined" || "" ? 0 : safeParse(break_time);
  /* ---------- VALIDATION ---------- */
  if (!workerId) workerId = req.worker_id;

  if (!mongoose.isValidObjectId(parsedWorkerId)) {
    return next(new AppError("Invalid workerId", 400));
  }

  if (!parsedProject?.projectId) {
    return next(new AppError("Project ID missing", 400));
  }

  if (!comments) {
    return next(new AppError("Comments required", 400));
  }

  /* ---------- PROJECT CHECK ---------- */
  const projectData = await projectMode
    .findById(parsedProject.projectId)
    .lean();

  if (!projectData) {
    return next(new AppError("Project not found", 404));
  }

  const projectDate = projectData.project_details?.project_start_date;
  if (!projectDate) {
    return next(new AppError("Project start date missing", 400));
  }

  /* ---------- PAYLOAD ---------- */
  const payload = {
    tenantId,
    project: parsedProject,
    start_working_hours: parsedStartHours,
    finish_hours: parsedFinishHours,
    day_off,
    break_time: break_time === "undefined" || "" ? 0 : Number(breakTime),
    comments: parseComments,
    workerId: parsedWorkerId ? parsedWorkerId : workerId,
    lateReason,
    createdBy: req.role,
  };

  /* ---------- ATTACH IMAGES (DYNAMIC) ---------- */
  if (files.length > 0) {
    payload.images = files.map((file) => ({
      url: file.path,
      public_id: file.filename,
      field: file.fieldname, // file_0, file_1 (debug friendly)
    }));
  }

  /* ---------- CREATE RECORD ---------- */
  const newRecord = await hoursModel.create(payload);

  return sendSuccess(res, "Hours added successfully", {}, 200, true);
});

exports.updateWorkerHours = catchAsync(async (req, res, next) => {
  const { h_id } = req.query;

  if (!h_id || !mongoose.isValidObjectId(h_id)) {
    return next(new AppError("Invalid ID", 400));
  }

  const hoursDoc = await hoursModel.findById(h_id);
  if (!hoursDoc) {
    return next(new AppError("Record not found", 404));
  }

  const {
    project,
    day_off,
    start_working_hours,
    finish_hours,
    break_time,
    comments,
  } = req.body;

  // ✅ SAFE ASSIGNMENT
  if (project) hoursDoc.project = project;
  if (project.project_date) {
    const [day, month, year] = project.project_date.split("/");
    project.project_date = new Date(Date.UTC(year, month - 1, day));
  }
  if (typeof day_off === "boolean") hoursDoc.day_off = day_off;

  if (start_working_hours) {
    hoursDoc.start_working_hours = {
      hours: Number(start_working_hours.hours),
      minutes: Number(start_working_hours.minutes),
    };
  }

  if (finish_hours) {
    hoursDoc.finish_hours = {
      hours: Number(finish_hours.hours),
      minutes: Number(finish_hours.minutes),
    };
  }

  if (break_time) {
    hoursDoc.break_time = String(break_time);
  }

  if (comments) hoursDoc.comments = comments;

  // 🔥 save() → pre("save") hook runs
  await hoursDoc.save();

  return sendSuccess(res, "Hours updated successfully", hoursDoc, 200, true);
});

exports.getWeeklyHours = catchAsync(async (req, res, next) => {
  const { workerId, year } = req.query;

  if (!workerId || !mongoose.isValidObjectId(workerId))
    return next(new AppError("Invalid workerId", 400));

  const yearValue = year ? Number(year) : new Date().getFullYear();

  const result = await hoursModel.aggregate([
    {
      $match: { workerId: new mongoose.Types.ObjectId(workerId) },
    },
    {
      $addFields: {
        year: { $year: "$project.project_date" },
      },
    },
    {
      $match: { year: yearValue },
    },
    {
      $group: {
        _id: "$weekNumber",
        totalHours: { $sum: "$total_hours" },
        days: {
          $push: {
            _id: "$_id",
            date: "$project.project_date",
            total: "$total_hours",
            status: "$status",
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return sendSuccess(res, "Weekly data", result, 200, true);
});

exports.approveWeek = catchAsync(async (req, res, next) => {
  const { workerId, weekNumber } = req.body;

  if (!workerId || !weekNumber)
    return next(new AppError("Worker ID or weekNumber missing", 400));

  const result = await hoursModel.updateMany(
    { workerId, weekNumber },
    { status: "approved" },
  );

  return sendSuccess(
    res,
    `${result.modifiedCount} entries approved`,
    {},
    200,
    true,
  );
});

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
// exports.getAllHoursOfWorkerController = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;

//   /* ---------- TENANT VALIDATION ---------- */
//   if (!tenantId) {
//     return next(new AppError("Tenant Id missing in headers", 400));
//   }

//   if (!isValidCustomUUID(tenantId)) {
//     return next(new AppError("Invalid Tenant-Id", 400));
//   }

//   /* ---------- PAGINATION ---------- */
//   const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
//   const limit =
//     Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;
//   const skip = (page - 1) * limit;

//   /* ---------- CURRENT WEEK (MON–SUN) ---------- */
//   const today = new Date();
//   const day = today.getDay() === 0 ? 7 : today.getDay();

//   const weekStart = new Date(today);
//   weekStart.setDate(today.getDate() - day + 1);
//   weekStart.setHours(0, 0, 0, 0);

//   const weekEnd = new Date(weekStart);
//   weekEnd.setDate(weekStart.getDate() + 6);
//   weekEnd.setHours(23, 59, 59, 999);

//   /* ---------- FETCH ONLY CURRENT WEEK DATA ---------- */
//   const hoursData = await hoursModel
//     .find({
//       tenantId,
//       createdAt: {
//         $gte: weekStart,
//         $lte: weekEnd,
//       },
//     })
//     .populate([
//       {
//         path: "project.projectId",
//         select: "project_details.project_name",
//       },
//       {
//         path: "workerId",
//         select:
//           "worker_personal_details.firstName worker_personal_details.lastName worker_position personal_information.documents.profile_picture",
//         populate: {
//           path: "worker_position",
//           select: "position",
//         },
//       },
//     ])
//     .sort({ createdAt: -1 })
//     .lean();

//   /* ---------- WORKER MAP (LATE CHECK) ---------- */
//   const workerMap = new Map();

//   for (const item of hoursData) {
//     const workerKey = item.workerId?._id?.toString();
//     if (!workerKey) continue;

//     const lateResult = calculateLateHoursByDate({
//       projectDate: item.project?.project_date,
//       finishHours: item.finish_hours,
//       submittedAt: item.createdAt,
//       dayOff: item.day_off,
//       graceMinutes: 0,
//     });

//     if (!workerMap.has(workerKey)) {
//       workerMap.set(workerKey, {
//         latest: item,
//         is_late: lateResult.isLate,
//         late_minutes: lateResult.lateMinutes,
//         late_time: lateResult.lateTime,
//       });
//     } else {
//       const existing = workerMap.get(workerKey);

//       if (lateResult.isLate) {
//         existing.is_late = true;

//         if (lateResult.lateMinutes > existing.late_minutes) {
//           existing.late_minutes = lateResult.lateMinutes;
//           existing.late_time = lateResult.lateTime;
//         }
//       }
//     }
//   }

//   /* ---------- HOURS FORMATTER ---------- */
//   const formatHours = (decimalHours = 0) => {
//     const hours = Math.floor(decimalHours);
//     const minutes = Math.round((decimalHours - hours) * 60);

//     return {
//       decimal: decimalHours.toFixed(2),
//       hours,
//       minutes,
//       label: `${decimalHours.toFixed(2)} h (${hours}h ${minutes}min)`,
//     };
//   };

//   /* ---------- WEEK RANGE LABEL ---------- */
//   const formatWeekRangeLabel = (startDate, endDate) => {
//     const options = { day: "numeric", month: "short" };
//     return `${new Date(startDate).toLocaleDateString(
//       "en-IN",
//       options,
//     )} - ${new Date(endDate).toLocaleDateString(
//       "en-IN",
//       options,
//     )} ${new Date(endDate).getFullYear()}`;
//   };

//   /* ---------- TRANSFORM DATA ---------- */
//   const transformedData = Array.from(workerMap.values()).map(
//     ({ latest, is_late, late_minutes, late_time }) => ({
//       _id: latest._id,
//       tenantId: latest.tenantId,

//       worker: latest.workerId
//         ? {
//             _id: latest.workerId._id,
//             firstName: latest.workerId.worker_personal_details?.firstName || "",
//             lastName: latest.workerId.worker_personal_details?.lastName || "",
//             position: latest.workerId.worker_position?.[0]?.position || "",
//             profile_picture:
//               latest.workerId.personal_information.documents.profile_picture,
//           }
//         : null,

//       project: latest.project?.projectId
//         ? {
//             _id: latest.project.projectId._id,
//             project_name:
//               latest.project.projectId.project_details?.project_name || "",
//             project_date: latest.project.project_date,
//           }
//         : null,

//       weekNumber: latest.weekNumber,
//       status: latest.status,
//       start_working_hours: latest.start_working_hours,
//       finish_hours: latest.finish_hours,
//       break_time: latest.break_time,
//       comments: latest.comments,
//       image: latest.image,
//       createdAt: latest.createdAt,
//       updatedAt: latest.updatedAt,
//       createdBy: latest.createdBy || "",
//       total_hours: formatHours(latest.total_hours),

//       // ✅ WORKER LEVEL LATE FLAG
//       is_late,
//       late_time,
//       late_minutes,

//       weekRange: {
//         startDate: weekStart.toISOString().split("T")[0],
//         endDate: weekEnd.toISOString().split("T")[0],
//         label: formatWeekRangeLabel(weekStart, weekEnd),
//       },
//     }),
//   );

//   /* ---------- PAGINATION ---------- */
//   const paginatedData = transformedData.slice(skip, skip + limit);

//   /* ---------- RESPONSE ---------- */
//   return sendSuccess(
//     res,
//     "Current week worker hours fetched successfully",
//     {
//       total: transformedData.length,
//       page,
//       limit,
//       totalPages: Math.ceil(transformedData.length / limit),
//       data: paginatedData,
//     },
//     200,
//     true,
//   );
// });

// exports.getAllHoursOfWorkerController = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;

//   /* ---------- TENANT VALIDATION ---------- */
//   if (!tenantId) {
//     return next(new AppError("Tenant Id missing in headers", 400));
//   }

//   if (!isValidCustomUUID(tenantId)) {
//     return next(new AppError("Invalid Tenant-Id", 400));
//   }

//   /* ---------- PAGINATION ---------- */
//   const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
//   const limit =
//     Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;
//   const skip = (page - 1) * limit;

//   /* ---------- CURRENT WEEK (MON–SUN) ---------- */
//   const today = new Date();
//   const day = today.getDay() === 0 ? 7 : today.getDay();

//   const weekStart = new Date(today);
//   weekStart.setDate(today.getDate() - day + 1);
//   weekStart.setHours(0, 0, 0, 0);

//   const weekEnd = new Date(weekStart);
//   weekEnd.setDate(weekStart.getDate() + 6);
//   weekEnd.setHours(23, 59, 59, 999);

//   /* ---------- BUILD QUERY ---------- */
//   const query = { tenantId };

//   /* DATE FILTER */
//   if (req.body?.date) {
//     const inputDate = new Date(req.body.date);

//     const startOfDay = new Date(inputDate);
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date(inputDate);
//     endOfDay.setHours(23, 59, 59, 999);

//     query.createdAt = {
//       $gte: startOfDay,
//       $lte: endOfDay,
//     };
//   } else {
//     query.createdAt = {
//       $gte: weekStart,
//       $lte: weekEnd,
//     };
//   }

//   /* STATUS FILTER */
//   if (req.body?.status) {
//     query.status = req.body.status;
//   }

//   /* WORKER FILTER */
//   if (Array.isArray(req.body?.workerIds) && req.body.workerIds.length > 0) {
//     query.workerId = {
//       $in: req.body.workerIds.map((id) => new mongoose.Types.ObjectId(id)),
//     };
//   }

//   /* PROJECT FILTER */
//   if (Array.isArray(req.body?.projectIds) && req.body.projectIds.length > 0) {
//     query["project.projectId"] = {
//       $in: req.body.projectIds.map((id) => new mongoose.Types.ObjectId(id)),
//     };
//   }

//   /* ---------- FETCH DATA ---------- */
//   const hoursData = await hoursModel
//     .find(query)
//     .populate([
//       {
//         path: "project.projectId",
//         select: "project_details.project_name",
//       },
//       {
//         path: "workerId",
//         select:
//           "worker_personal_details.firstName worker_personal_details.lastName worker_position personal_information.documents.profile_picture",
//         populate: {
//           path: "worker_position",
//           select: "position",
//         },
//       },
//     ])
//     .sort({ createdAt: -1 })
//     .lean();

//   /* ---------- WORKER MAP (LATEST + LATE CHECK) ---------- */
//   const workerMap = new Map();

//   for (const item of hoursData) {
//     const workerKey = item.workerId?._id?.toString();
//     if (!workerKey) continue;

//     const lateResult = calculateLateHoursByDate({
//       projectDate: item.project?.project_date,
//       finishHours: item.finish_hours,
//       submittedAt: item.createdAt,
//       dayOff: item.day_off,
//       graceMinutes: 0,
//     });

//     if (!workerMap.has(workerKey)) {
//       workerMap.set(workerKey, {
//         latest: item,
//         is_late: lateResult.isLate,
//         late_minutes: lateResult.lateMinutes,
//         late_time: lateResult.lateTime,
//       });
//     } else {
//       const existing = workerMap.get(workerKey);

//       if (lateResult.isLate) {
//         existing.is_late = true;

//         if (lateResult.lateMinutes > existing.late_minutes) {
//           existing.late_minutes = lateResult.lateMinutes;
//           existing.late_time = lateResult.lateTime;
//         }
//       }
//     }
//   }

//   /* ---------- HOURS FORMATTER ---------- */
//   const formatHours = (decimalHours = 0) => {
//     const hours = Math.floor(decimalHours);
//     const minutes = Math.round((decimalHours - hours) * 60);

//     return {
//       decimal: decimalHours.toFixed(2),
//       hours,
//       minutes,
//       label: `${decimalHours.toFixed(2)} h (${hours}h ${minutes}min)`,
//     };
//   };

//   /* ---------- WEEK RANGE LABEL ---------- */
//   const formatWeekRangeLabel = (startDate, endDate) => {
//     const options = { day: "numeric", month: "short" };
//     return `${new Date(startDate).toLocaleDateString(
//       "en-IN",
//       options,
//     )} - ${new Date(endDate).toLocaleDateString(
//       "en-IN",
//       options,
//     )} ${new Date(endDate).getFullYear()}`;
//   };

//   /* ---------- TRANSFORM DATA ---------- */
//   const transformedData = Array.from(workerMap.values()).map(
//     ({ latest, is_late, late_minutes, late_time }) => ({
//       _id: latest._id,
//       tenantId: latest.tenantId,

//       worker: latest.workerId
//         ? {
//             _id: latest.workerId._id,
//             firstName: latest.workerId.worker_personal_details?.firstName || "",
//             lastName: latest.workerId.worker_personal_details?.lastName || "",
//             position: latest.workerId.worker_position?.[0]?.position || "",
//             profile_picture:
//               latest.workerId.personal_information.documents.profile_picture,
//           }
//         : null,

//       project: latest.project?.projectId
//         ? {
//             _id: latest.project.projectId._id,
//             project_name:
//               latest.project.projectId.project_details?.project_name || "",
//             project_date: latest.project.project_date,
//           }
//         : null,

//       weekNumber: latest.weekNumber,
//       status: latest.status,
//       start_working_hours: latest.start_working_hours,
//       finish_hours: latest.finish_hours,
//       break_time: latest.break_time,
//       comments: latest.comments,
//       image: latest.image,
//       createdAt: latest.createdAt,
//       updatedAt: latest.updatedAt,
//       createdBy: latest.createdBy || "",
//       total_hours: formatHours(latest.total_hours),

//       is_late,
//       late_time,
//       late_minutes,

//       weekRange: {
//         startDate: weekStart.toISOString().split("T")[0],
//         endDate: weekEnd.toISOString().split("T")[0],
//         label: formatWeekRangeLabel(weekStart, weekEnd),
//       },
//     }),
//   );

//   /* ---------- PAGINATION ---------- */
//   const paginatedData = transformedData.slice(skip, skip + limit);

//   /* ---------- RESPONSE ---------- */
//   return sendSuccess(
//     res,
//     "Current week worker hours fetched successfully",
//     {
//       total: transformedData.length,
//       page,
//       limit,
//       totalPages: Math.ceil(transformedData.length / limit),
//       data: paginatedData,
//     },
//     200,
//     true,
//   );
// });

// exports.getAllHoursOfWorkerController = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;

//   /* ---------- TENANT VALIDATION ---------- */
//   if (!tenantId) {
//     return next(new AppError("Tenant Id missing in headers", 400));
//   }

//   if (!isValidCustomUUID(tenantId)) {
//     return next(new AppError("Invalid Tenant-Id", 400));
//   }

//   /* ---------- PAGINATION ---------- */
//   const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
//   const limit =
//     Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;
//   const skip = (page - 1) * limit;

//   /* ---------- CURRENT WEEK (MON–SUN) ---------- */
//   const today = new Date();
//   const day = today.getDay() === 0 ? 7 : today.getDay();

//   const weekStart = new Date(today);
//   weekStart.setDate(today.getDate() - day + 1);
//   weekStart.setHours(0, 0, 0, 0);

//   const weekEnd = new Date(weekStart);
//   weekEnd.setDate(weekStart.getDate() + 6);
//   weekEnd.setHours(23, 59, 59, 999);

//   /* ---------- BUILD QUERY ---------- */
//   const query = { tenantId };

//   /* DATE FILTER */
//   if (Array.isArray(req.body?.date) && req.body?.date.length > 0) {
//     const startDate = new Date(req.body.date[0]);
//     const endDate = new Date(req.body?.date[1]);

//     const startOfDay = new Date(startDate);
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date(endDate);
//     endOfDay.setHours(23, 59, 59, 999);

//     query.createdAt = {
//       $gte: startOfDay,
//       $lte: endOfDay,
//     };
//   } else {
//     query.createdAt = {
//       $gte: weekStart,
//       $lte: weekEnd,
//     };
//   }

//   /* STATUS FILTER */
//   if (req.body?.status) {
//     query.status = req.body.status;
//   }

//   /* WORKER FILTER */
//   if (Array.isArray(req.body?.workerIds) && req.body.workerIds.length > 0) {
//     query.workerId = {
//       $in: req.body.workerIds.map((id) => new mongoose.Types.ObjectId(id)),
//     };
//   }

//   /* PROJECT FILTER */
//   if (Array.isArray(req.body?.projectIds) && req.body.projectIds.length > 0) {
//     query["project.projectId"] = {
//       $in: req.body.projectIds.map((id) => new mongoose.Types.ObjectId(id)),
//     };
//   }

//   /* ---------- FETCH DATA ---------- */
//   const hoursData = await hoursModel
//     .find(query)
//     .populate([
//       {
//         path: "project.projectId",
//         select: "project_details.project_name",
//       },
//       {
//         path: "workerId",
//         select:
//           "worker_personal_details.firstName worker_personal_details.lastName worker_position personal_information.documents.profile_picture",
//         populate: {
//           path: "worker_position",
//           select: "position",
//         },
//       },
//     ])
//     .sort({ createdAt: -1 })
//     .lean();
//   // console.log("data", hoursData);
//   /* ---------- WORKER MAP (LATEST + LATE CHECK) ---------- */
//   const workerMap = new Map();

//   for (const item of hoursData) {
//     const workerKey = item.workerId?._id?.toString();
//     if (!workerKey) continue;

//     const lateResult = calculateLateHoursByDate({
//       projectDate: item.project?.project_date,
//       // finishHours: item.finish_hours,
//       createdAt: item.createdAt,
//       dayOff: item.day_off,
//       graceMinutes: 0,
//     });
//     // console.log("late", lateResult);
//     if (!workerMap.has(workerKey)) {
//       workerMap.set(workerKey, {
//         latest: item,
//         is_late: lateResult.isLate,
//         late_minutes: lateResult.lateMinutes,
//         late_time: lateResult.lateTime,
//       });
//     } else {
//       const existing = workerMap.get(workerKey);

//       if (lateResult.isLate) {
//         existing.is_late = true;

//         if (lateResult.lateMinutes > existing.late_minutes) {
//           existing.late_minutes = lateResult.lateMinutes;
//           existing.late_time = lateResult.lateTime;
//         }
//       }
//     }
//   }

//   /* ---------- HOURS FORMATTER ---------- */
//   const formatHours = (decimalHours = 0) => {
//     const hours = Math.floor(decimalHours);
//     const minutes = Math.round((decimalHours - hours) * 60);

//     return {
//       decimal: decimalHours.toFixed(2),
//       hours,
//       minutes,
//       label: `${decimalHours.toFixed(2)} h (${hours}h ${minutes}min)`,
//     };
//   };

//   /* ---------- WEEK RANGE LABEL ---------- */
//   const formatWeekRangeLabel = (startDate, endDate) => {
//     const options = { day: "numeric", month: "short" };
//     return `${new Date(startDate).toLocaleDateString(
//       "en-IN",
//       options,
//     )} - ${new Date(endDate).toLocaleDateString(
//       "en-IN",
//       options,
//     )} ${new Date(endDate).getFullYear()}`;
//   };

//   /* ---------- TRANSFORM DATA ---------- */
//   const transformedData = Array.from(workerMap.values()).map(
//     ({ latest, is_late, late_minutes, late_time }) => ({
//       _id: latest._id,
//       tenantId: latest.tenantId,

//       worker: latest.workerId
//         ? {
//             _id: latest.workerId._id,
//             firstName: latest.workerId.worker_personal_details?.firstName || "",
//             lastName: latest.workerId.worker_personal_details?.lastName || "",
//             position: latest.workerId.worker_position?.[0]?.position || "",
//             profile_picture:
//               latest.workerId.personal_information.documents.profile_picture,
//           }
//         : null,

//       project: latest.project?.projectId
//         ? {
//             _id: latest.project.projectId._id,
//             project_name:
//               latest.project.projectId.project_details?.project_name || "",
//             project_date: latest.project.project_date,
//           }
//         : null,

//       weekNumber: latest.weekNumber,
//       status: latest.status,
//       start_working_hours: latest.start_working_hours,
//       finish_hours: latest.finish_hours,
//       break_time: latest.break_time,
//       comments: latest.comments,
//       image: latest.image,
//       createdAt: latest.createdAt,
//       updatedAt: latest.updatedAt,
//       createdBy: latest.createdBy || "",
//       total_hours: formatHours(latest.total_hours),
//       lateReason: latest.lateReason,
//       is_late,
//       late_time,
//       late_minutes,

//       weekRange: {
//         startDate: weekStart.toISOString().split("T")[0],
//         endDate: weekEnd.toISOString().split("T")[0],
//         label: formatWeekRangeLabel(weekStart, weekEnd),
//       },
//     }),
//   );

//   /* ---------- PAGINATION ---------- */
//   const paginatedData = transformedData.slice(skip, skip + limit);

//   /* ---------- RESPONSE ---------- */
//   return sendSuccess(
//     res,
//     "Current week worker hours fetched successfully",
//     {
//       total: transformedData.length,
//       page,
//       limit,
//       totalPages: Math.ceil(transformedData.length / limit),
//       data: paginatedData,
//     },
//     200,
//     true,
//   );
// });

//  get single worker hours for weekly
// exports.getSingleWorkerWeeklyHoursController = catchAsync(
//   async (req, res, next) => {
//     const { tenantId } = req;
//     const { workerId } = req.query;
//     const weekOffset = Number(req.query.weekOffset) || 0;

//     /* ---------- VALIDATION ---------- */
//     if (!tenantId) {
//       return next(new AppError("Tenant Id missing in headers", 400));
//     }

//     if (!isValidCustomUUID(tenantId)) {
//       return next(new AppError("Invalid Tenant-Id", 400));
//     }

//     if (!workerId) {
//       return next(new AppError("Worker Id missing", 400));
//     }

//     /* ---------- WEEK CALCULATION (MON–SUN) ---------- */
//     const today = new Date();
//     const day = today.getDay() === 0 ? 7 : today.getDay();

//     const weekStart = new Date(today);
//     weekStart.setDate(today.getDate() - day + 1 + weekOffset * 7);
//     weekStart.setHours(0, 0, 0, 0);

//     const weekEnd = new Date(weekStart);
//     weekEnd.setDate(weekStart.getDate() + 6);
//     weekEnd.setHours(23, 59, 59, 999);
//     /* ---------- FETCH DATA ---------- */
//     const hoursData = await hoursModel
//       .find({
//         tenantId,
//         workerId,
//         createdAt: { $gte: weekStart, $lte: weekEnd },
//       })
//       .populate([
//         {
//           path: "project.projectId",
//           select:
//             "project_details.project_name project_details.project_location_address",
//         },
//         {
//           path: "workerId",
//           select:
//             "worker_personal_details.firstName worker_personal_details.lastName worker_position personal_information.documents.profile_picture",
//           populate: {
//             path: "worker_position",
//             select: "position",
//           },
//         },
//       ])
//       .sort({ createdAt: -1 })
//       .lean();

//     /* ---------- HOURS FORMATTER ---------- */
//     const formatHours = (decimalHours = 0) => {
//       const hours = Math.floor(decimalHours);
//       const minutes = Math.round((decimalHours - hours) * 60);

//       return {
//         decimal: decimalHours.toFixed(2),
//         hours,
//         minutes,
//         label: `${decimalHours.toFixed(2)} h (${hours}h ${minutes}min)`,
//       };
//     };

//     /* ---------- TRANSFORM DATA ---------- */
//     const finalData = hoursData.map((obj) => {
//       const lateResult = calculateLateByProjectEnd({
//         projectDate: obj.project?.project_date,
//         finishHours: obj.finish_hours,
//         submittedAt: obj.createdAt,
//         dayOff: obj.day_off,
//         graceMinutes: 0, // configurable
//       });

//       return {
//         _id: obj._id,
//         date: obj.createdAt,

//         worker: obj.workerId
//           ? {
//               _id: obj.workerId._id,
//               firstName: obj.workerId.worker_personal_details?.firstName || "",
//               lastName: obj.workerId.worker_personal_details?.lastName || "",
//               position: obj.workerId.worker_position?.[0]?.position || "",
//               profile_picture:
//                 obj.workerId.personal_information.documents.profile_picture,
//             }
//           : null,

//         project: obj.project?.projectId
//           ? {
//               _id: obj.project.projectId._id,
//               project_name:
//                 obj.project.projectId?.project_details?.project_name || "",
//               project_date: obj.project.project_date || "",
//               address:
//                 obj.project.projectId.project_details
//                   ?.project_location_address || "",
//             }
//           : null,

//         start_working_hours: obj.start_working_hours,
//         finish_hours: obj.finish_hours,
//         break_time: obj.break_time,
//         day_off: obj.day_off,
//         weekNumber: obj.weekNumber,
//         status: obj.status,
//         comments: obj.comments,
//         image: obj.images,
//         createdBy: obj?.createdBy || "",
//         total_hours: formatHours(obj.total_hours),

//         lateReason: obj?.lateReason,
//         is_late: lateResult.isLate,
//         late_time: lateResult.lateTime,
//         late_minutes: lateResult.lateMinutes,
//       };
//     });

//     /* ---------- RESPONSE ---------- */
//     return sendSuccess(
//       res,
//       "Worker weekly hours fetched successfully",
//       finalData,
//       200,
//       true,
//     );
//   },
// );

// exports.getSingleWorkerWeeklyHoursController = catchAsync(
//   async (req, res, next) => {
//     const { tenantId } = req;
//     const { startDate, endDate, workerId } = req.body;
//     const weekOffset = Number(req.query.weekOffset) || 0;

//     /* ---------- VALIDATION ---------- */
//     if (!tenantId) {
//       return next(new AppError("Tenant Id missing in headers", 400));
//     }

//     if (!isValidCustomUUID(tenantId)) {
//       return next(new AppError("Invalid Tenant-Id", 400));
//     }

//     if (!workerId) {
//       return next(new AppError("Worker Id missing", 400));
//     }

//     /* ---------- WEEK CALCULATION (MON–SUN) ---------- */
//     const today = new Date();
//     const day = today.getDay() === 0 ? 7 : today.getDay();

//     const weekStart = new Date(today);
//     weekStart.setDate(today.getDate() - day + 1 + weekOffset * 7);
//     weekStart.setHours(0, 0, 0, 0);

//     const weekEnd = new Date(weekStart);
//     weekEnd.setDate(weekStart.getDate() + 6);
//     weekEnd.setHours(23, 59, 59, 999);
//     /* ---------- FETCH DATA ---------- */
//     const hoursData = await hoursModel
//       .find({
//         tenantId,
//         workerId,
//         "project.project_date": { $gte: weekStart, $lte: weekEnd },
//       })
//       .populate([
//         {
//           path: "project.projectId",
//           select:
//             "project_details.project_name project_details.project_location_address",
//         },
//         {
//           path: "workerId",
//           select:
//             "worker_personal_details.firstName worker_personal_details.lastName worker_position personal_information.documents.profile_picture",
//           populate: {
//             path: "worker_position",
//             select: "position",
//           },
//         },
//       ])
//       .sort({ createdAt: -1 })
//       .lean();

//     /* ---------- HOURS FORMATTER ---------- */
//     const formatHours = (decimalHours = 0) => {
//       const hours = Math.floor(decimalHours);
//       const minutes = Math.round((decimalHours - hours) * 60);

//       return {
//         decimal: decimalHours.toFixed(2),
//         hours,
//         minutes,
//         label: `${decimalHours.toFixed(2)} h (${hours}h ${minutes}min)`,
//       };
//     };

//     /* ---------- TRANSFORM DATA ---------- */
//     const finalData = hoursData.map((obj) => {
//       const lateResult = calculateLateByProjectEnd({
//         projectDate: obj.project?.project_date,
//         finishHours: obj.finish_hours,
//         submittedAt: obj.createdAt,
//         dayOff: obj.day_off,
//         graceMinutes: 0, // configurable
//       });

//       return {
//         _id: obj._id,
//         date: obj.createdAt,

//         worker: obj.workerId
//           ? {
//               _id: obj.workerId._id,
//               firstName: obj.workerId.worker_personal_details?.firstName || "",
//               lastName: obj.workerId.worker_personal_details?.lastName || "",
//               position: obj.workerId.worker_position?.[0]?.position || "",
//               profile_picture:
//                 obj.workerId.personal_information.documents.profile_picture,
//             }
//           : null,

//         project: obj.project?.projectId
//           ? {
//               _id: obj.project.projectId._id,
//               project_name:
//                 obj.project.projectId?.project_details?.project_name || "",
//               project_date: obj.project.project_date || "",
//               address:
//                 obj.project.projectId.project_details
//                   ?.project_location_address || "",
//             }
//           : null,

//         start_working_hours: obj.start_working_hours,
//         finish_hours: obj.finish_hours,
//         break_time: obj.break_time,
//         day_off: obj.day_off,
//         weekNumber: obj.weekNumber,
//         status: obj.status,
//         comments: obj.comments,
//         image: obj.images,
//         createdBy: obj?.createdBy || "",
//         total_hours: formatHours(obj.total_hours),

//         lateReason: obj?.lateReason,
//         is_late: lateResult.isLate,
//         late_time: lateResult.lateTime,
//         late_minutes: lateResult.lateMinutes,
//       };
//     });

//     /* ---------- RESPONSE ---------- */
//     return sendSuccess(
//       res,
//       "Worker weekly hours fetched successfully",
//       finalData,
//       200,
//       true,
//     );
//   },
// );

// update worker hours comment
exports.updateHoursCommment = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { h_id } = req.query;
  const { comment } = req.body;

  /* ---------- TENANT VALIDATION ---------- */
  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

  /* ---------- HOURS ID VALIDATION ---------- */
  if (!h_id) {
    return next(new AppError("Hours id missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(h_id)) {
    return next(new AppError("Invalid worker hours-id", 400));
  }

  /* ---------- COMMENT VALIDATION ---------- */
  if (!comment || !comment.trim()) {
    return next(new AppError("Comment is required", 400));
  }

  /* ---------- UPDATE COMMENT ---------- */
  const hoursUpdate = await hoursModel.findOneAndUpdate(
    { _id: h_id, tenantId },
    { $set: { comments: comment.trim() } },
    { new: true },
  );

  if (!hoursUpdate) {
    return next(new AppError("Submitted hour not found", 404));
  }

  return sendSuccess(res, "Comment updated successfully", {}, 200, true);
});

// update worker hors time
exports.updateTimeInHours = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { id } = req.query; // worker_hours document id

  const { start_working_hours, finish_hours } = req.body;

  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

  const hoursDoc = await hoursModel.findOne({
    _id: id,
    tenantId,
  });

  if (!hoursDoc) {
    return next(new AppError("Worker hours not found", 404));
  }

  //
  if (start_working_hours) {
    hoursDoc.start_working_hours = start_working_hours;
  }

  if (finish_hours) {
    hoursDoc.finish_hours = finish_hours;
  }

  await hoursDoc.save();

  return sendSuccess(res, "update success", {}, 201, true);
});

// approve hours
exports.approveHours = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("tenantId Missing", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }

  const { h_id, type } = req.query;

  if (!h_id || !mongoose.isValidObjectId(h_id)) {
    return next(new AppError("Invalid hours id", 400));
  }

  const allowedStatus = ["review", "approved"];

  if (!allowedStatus.includes(type)) {
    return next(
      new AppError(
        `Invalid status type. Allowed: ${allowedStatus.join(", ")}`,
        400,
      ),
    );
  }

  const result = await hoursModel.findOneAndUpdate(
    { _id: h_id, tenantId },
    { $set: { status: type } },
    { new: true, runValidators: true },
  );

  if (!result) {
    return next(new AppError("Record not found", 404));
  }

  return sendSuccess(res, `hours ${type} successfully`, {}, 200, true);
});

// <------- dahsboard hours --------->

exports.dashboardHours = catchAsync(async (req, res, next) => {
  const { tenantId, client_id } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  const now = new Date();

  /* ---------- DATE RANGES ---------- */

  // Current Month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Last Month
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  /* ---------- CLIENT → PROJECT → WORKERS ---------- */

  const clientProjects = await projectMode
    .find({
      tenantId,
      "client_details.client": client_id,
    })
    .select("project_workers.workers")
    .lean();

  // collect worker ids
  let worker_ids = clientProjects.flatMap(
    (p) => p.project_workers?.workers || [],
  );

  // remove duplicates + ensure ObjectId
  worker_ids = [...new Set(worker_ids.map((id) => id.toString()))].map(
    (id) => new mongoose.Types.ObjectId(id),
  );

  if (worker_ids.length === 0) {
    return sendSuccess(
      res,
      "success",
      {
        monthly_hours: {
          title: "total hours this month",
          total: "0.00h",
          last_month: "0.00h",
          evaluation: {
            type: "good",
            value: "0%",
          },
        },
      },
      200,
      true,
    );
  }

  const [pendingResult, currentMonthResult, lastMonthResult] =
    await Promise.all([
      hoursModel.aggregate([
        {
          $match: {
            tenantId,
            workerId: { $in: worker_ids },
            status: "pending",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$total_hours", 0] } },
            pendingCount: { $sum: 1 },
          },
        },
      ]),

      hoursModel.aggregate([
        {
          $match: {
            tenantId,
            workerId: { $in: worker_ids }, // ✅ FIXED
            createdAt: { $gte: startOfMonth, $lt: endOfMonth },
            status: "approved",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$total_hours", 0] } },
          },
        },
      ]),

      hoursModel.aggregate([
        {
          $match: {
            tenantId,
            workerId: { $in: worker_ids }, // ✅ FIXED
            createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth },
            status: "approved",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$total_hours", 0] } },
          },
        },
      ]),
    ]);

  /* ---------- VALUES ---------- */
  const pendingHours = pendingResult[0]?.total || 0;
  const pendingCount = pendingResult[0]?.pendingCount || 0;
  const currentMonthHours = currentMonthResult[0]?.total || 0;
  const lastMonthHours = lastMonthResult[0]?.total || 0;

  /* ---------- 4️⃣ Percentage Hike (clamped) ---------- */
  let hikePercentage = 0;
  let isUp = true;

  if (lastMonthHours > 0) {
    const rawPercentage =
      ((currentMonthHours - lastMonthHours) / lastMonthHours) * 100;

    // clamp between -100 and +100
    hikePercentage = Math.max(-100, Math.min(rawPercentage, 100));
    isUp = hikePercentage >= 0;
  }

  /* ---------- RESPONSE FORMAT ---------- */
  const formatedData = {
    monthly_hours: {
      title: "total hours this month",
      total: `${currentMonthHours.toFixed(2)}h`,
      last_month: `${lastMonthHours.toFixed(2)}h`,
      evaluation: {
        type: isUp ? "good" : "bad",
        value: `${hikePercentage.toFixed(2)}%`,
      },
    },
    pending: {
      pending_hours: `${pendingHours.toFixed(2)}h`,
      worker_pending: pendingCount,
    },
  };

  return sendSuccess(res, "success", formatedData, 200, true);
});

// exports.dashboardHours = catchAsync(async (req, res, next) => {
//   const { tenantId, client_id } = req;

//   if (!tenantId) {
//     return next(new AppError("Tenant Id missing in headers", 400));
//   }

//   const now = new Date();

//   const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//   const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

//   const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//   const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

//   const workersResult = await projectMode.aggregate([
//     {
//       $match: {
//         tenantId,
//         "client_details.client": client_id,
//       },
//     },
//     { $unwind: "$project_workers.workers" },
//     {
//       $group: {
//         _id: null,
//         workers: { $addToSet: "$project_workers.workers" },
//       },
//     },
//   ]);
// console.log("ww",workersResult)
//   const workerIds = workersResult[0]?.workers || [];

//   if (workerIds.length === 0) {
//     return sendSuccess(
//       res,
//       "success",
//       {
//         monthly_hours: {
//           title: "total hours this month",
//           total: "0.00h",
//           last_month: "0.00h",
//           evaluation: { type: "good", value: "0%" },
//         },
//         pending: {
//           pending_hours: "0.00h",
//           worker_pending: 0,
//         },
//       },
//       200,
//       true,
//     );
//   }

//   const hoursResult = await hoursModel.aggregate([
//     {
//       $match: {
//         tenantId,
//         workerId: { $in: workerIds },
//         createdAt: { $gte: startOfLastMonth, $lt: endOfMonth },
//       },
//     },
//     {
//       $facet: {
//         currentMonth: [
//           {
//             $match: {
//               status: "approved",
//               createdAt: { $gte: startOfMonth, $lt: endOfMonth },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total: { $sum: { $ifNull: ["$total_hours", 0] } },
//             },
//           },
//         ],

//         lastMonth: [
//           {
//             $match: {
//               status: "approved",
//               createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total: { $sum: { $ifNull: ["$total_hours", 0] } },
//             },
//           },
//         ],

//         pending: [
//           {
//             $match: { status: "pending" },
//           },
//           {
//             $group: {
//               _id: null,
//               total: { $sum: { $ifNull: ["$total_hours", 0] } },
//               count: { $sum: 1 },
//             },
//           },
//         ],
//       },
//     },
//   ]);

//   const data = hoursResult[0] || {};

//   const currentMonthHours = data.currentMonth?.[0]?.total || 0;
//   const lastMonthHours = data.lastMonth?.[0]?.total || 0;
//   const pendingHours = data.pending?.[0]?.total || 0;
//   const pendingCount = data.pending?.[0]?.count || 0;

//   const evaluation = calculateEvaluation(currentMonthHours, lastMonthHours);

//   return sendSuccess(
//     res,
//     "success",
//     {
//       monthly_hours: {
//         title: "total hours this month",
//         total: `${currentMonthHours.toFixed(2)}h`,
//         last_month: `${lastMonthHours.toFixed(2)}h`,
//         evaluation,
//       },
//       pending: {
//         pending_hours: `${pendingHours.toFixed(2)}h`,
//         worker_pending: pendingCount,
//       },
//     },
//     200,
//     true,
//   );
// });

// <---------- admin dashobard stats ------------>
// exports.addminDashboardStats = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;
//   if (!tenantId || !isValidCustomUUID(tenantId)) {
//     return next(new AppError("tenant Invalid", 400));
//   }
//   const now = new Date();
//   // current month
//   const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//   const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

//   // Last Month
//   const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//   const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//   const [current_hours_data, project_data, active_worker] = await Promise.all([
//     //  total approve hours current month
//     hoursModel.aggregate([
//       {
//         $match: {
//           tenantId,
//           createdAt: {
//             $gte: startOfLastMonth,
//             $lt: endOfMonth,
//           },
//         },
//       },
//       {
//         $facet: {
//           currentMonth: [
//             {
//               $match: {
//                 createdAt: {
//                   $gte: startOfMonth,
//                   $lt: endOfMonth,
//                 },
//               },
//             },
//             {
//               $group: {
//                 _id: null,
//                 approvedHours: {
//                   $sum: {
//                     $cond: [
//                       { $eq: ["$status", "approved"] },
//                       { $ifNull: ["$total_hours", 0] },
//                       0,
//                     ],
//                   },
//                 },
//               },
//             },
//           ],

//           lastMonth: [
//             {
//               $match: {
//                 createdAt: {
//                   $gte: startOfLastMonth,
//                   $lt: endOfLastMonth,
//                 },
//               },
//             },
//             {
//               $group: {
//                 _id: null,
//                 approvedHours: {
//                   $sum: {
//                     $cond: [
//                       { $eq: ["$status", "approved"] },
//                       { $ifNull: ["$total_hours", 0] },
//                       0,
//                     ],
//                   },
//                 },
//               },
//             },
//           ],
//         },
//       },
//     ]),

//     // project data last and current month
//     projectMode.aggregate([
//       {
//         $match: {
//           tenantId,
//         },
//       },
//       {
//         $facet: {
//           //  Active projects in current month
//           currentMonthActive: [
//             {
//               $match: {
//                 is_complete: false,
//               },
//             },
//             {
//               $count: "count",
//             },
//           ],

//           // Projects completed in last month
//           lastMonthCompleted: [
//             {
//               $match: {
//                 is_complete: true,
//                 completedAt: {
//                   $gte: startOfLastMonth,
//                   $lt: endOfLastMonth,
//                 },
//               },
//             },
//             {
//               $count: "count",
//             },
//           ],
//         },
//       },
//     ]),

//     //  worker count in current and last monnth
//     projectMode.aggregate([
//       {
//         $match: { tenantId },
//       },
//       {
//         $facet: {
//           //  Current active workers
//           currentActiveWorkers: [
//             {
//               $match: {
//                 is_complete: false,
//               },
//             },
//             { $unwind: "$project_workers.workers" },
//             {
//               $group: {
//                 _id: null,
//                 workers: { $addToSet: "$project_workers.workers" },
//               },
//             },
//             {
//               $project: {
//                 _id: 0,
//                 count: { $size: "$workers" },
//               },
//             },
//           ],

//           //  Last month active workers (from completed projects)
//           lastMonthActiveWorkers: [
//             {
//               $match: {
//                 is_complete: true,
//                 completedAt: {
//                   $gte: startOfLastMonth,
//                   $lt: endOfLastMonth,
//                 },
//               },
//             },
//             { $unwind: "$project_workers.workers" },
//             {
//               $group: {
//                 _id: null,
//                 workers: { $addToSet: "$project_workers.workers" },
//               },
//             },
//             {
//               $project: {
//                 _id: 0,
//                 count: { $size: "$workers" },
//               },
//             },
//           ],
//         },
//       },
//     ]),
//   ]);
//   const currentHours =
//     current_hours_data[0]?.currentMonth[0]?.approvedHours || 0;

//   const lastMonthHours =
//     current_hours_data[0]?.lastMonth[0]?.approvedHours || 0;

//   const currentProjects = project_data[0]?.currentMonthActive[0]?.count || 0;

//   const lastMonthProjects = project_data[0]?.lastMonthCompleted[0]?.count || 0;
//   const filterdData = [
//     {
//       total: `${currentHours}h`,
//       last_month: `${lastMonthHours}h`,
//       evaluation: calculateEvaluation(currentHours, lastMonthHours),
//     },
//     {
//       total: `${currentProjects}`,
//       last_month: `${lastMonthProjects}`,
//       evaluation: calculateEvaluation(currentProjects, lastMonthProjects),
//     },
//   ];

//   return sendSuccess(res, "success", filterdData, 200, true);
//   // res.json({ current_hours_data, project_data });
// });

exports.addminDashboardStats = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId || !isValidCustomUUID(tenantId)) {
    return next(new AppError("tenant Invalid", 400));
  }

  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [hoursData, projectStats] = await Promise.all([
    // 🕒 HOURS (single scan)
    hoursModel.aggregate([
      {
        $match: {
          tenantId,
          status: "approved",
          createdAt: { $gte: startOfLastMonth, $lt: endOfMonth },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$createdAt", startOfMonth] },
                    { $lt: ["$createdAt", endOfMonth] },
                  ],
                },
                "current",
                "last",
              ],
            },
          },
          hours: { $sum: { $ifNull: ["$total_hours", 0] } },
        },
      },
    ]),

    // 📦 PROJECT + WORKER (single scan)
    projectMode.aggregate([
      {
        $match: { tenantId },
      },
      {
        $facet: {
          projects: [
            {
              $group: {
                _id: {
                  type: {
                    $cond: [
                      { $eq: ["$is_complete", false] },
                      "current",
                      {
                        $cond: [
                          {
                            $and: [
                              { $eq: ["$is_complete", true] },
                              { $gte: ["$completedAt", startOfLastMonth] },
                              { $lt: ["$completedAt", endOfLastMonth] },
                            ],
                          },
                          "last",
                          null,
                        ],
                      },
                    ],
                  },
                },
                count: { $sum: 1 },
              },
            },
          ],

          workers: [
            { $unwind: "$project_workers.workers" },
            {
              $group: {
                _id: {
                  worker: "$project_workers.workers",
                  type: {
                    $cond: [
                      { $eq: ["$is_complete", false] },
                      "current",
                      {
                        $cond: [
                          {
                            $and: [
                              { $eq: ["$is_complete", true] },
                              {
                                $gte: ["$completedAt", startOfLastMonth],
                              },
                              { $lt: ["$completedAt", endOfLastMonth] },
                            ],
                          },
                          "last",
                          null,
                        ],
                      },
                    ],
                  },
                },
              },
            },
            {
              $group: {
                _id: "$_id.type",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),
  ]);

  // 🧠 Normalize hours
  const currentHours =
    hoursData.find((d) => d._id.month === "current")?.hours || 0;
  const lastMonthHours =
    hoursData.find((d) => d._id.month === "last")?.hours || 0;

  // 🧠 Normalize projects
  const projectCounts = projectStats[0]?.projects || [];
  const currentProjects =
    projectCounts.find((p) => p._id.type === "current")?.count || 0;
  const lastMonthProjects =
    projectCounts.find((p) => p._id.type === "last")?.count || 0;

  const workerCounts = projectStats[0]?.workers || [];

  const currentWorkers =
    workerCounts.find((w) => w._id === "current")?.count || 0;

  const lastMonthWorkers =
    workerCounts.find((w) => w._id === "last")?.count || 0;
  const response = [
    {
      total: `${currentHours}h`,
      last_month: `${lastMonthHours}h`,
      evaluation: calculateEvaluation(currentHours, lastMonthHours),
    },
    {
      total: `${currentProjects}`,
      last_month: `${lastMonthProjects}`,
      evaluation: calculateEvaluation(currentProjects, lastMonthProjects),
    },
    {
      total: `${currentWorkers}`,
      last_month: `${lastMonthWorkers}`,
      evaluation: calculateEvaluation(currentWorkers, lastMonthWorkers),
    },
  ];

  return sendSuccess(res, "success", response, 200, true);
});

// <---------- admin dashboard stats end ---------->
// <------ dashboard hours end ---------->

// <-------- dashboard hours like total hours this month, active project this month and active worker this month ------->

exports.getDashboardStatsService = async () => {
  const current = getMonthRange(0);
  const last = getMonthRange(1);

  /* HOURS */
  const currentHours = await getTotalHours(current.start, current.end);
  const lastHours = await getTotalHours(last.start, last.end);

  /* WORKERS */
  const currentWorkerIds = await getActiveWorkerIds(current.start, current.end);
  const lastWorkerIds = await getActiveWorkerIds(last.start, last.end);

  const currentWorkers = await workerModel.countDocuments({
    _id: { $in: currentWorkerIds },
    isActive: true,
  });

  const lastWorkers = await workerModel.countDocuments({
    _id: { $in: lastWorkerIds },
    isActive: true,
  });

  /* PROJECTS */
  const currentProjects = (
    await getActiveProjectIds(current.start, current.end)
  ).length;

  const lastProjects = (await getActiveProjectIds(last.start, last.end)).length;

  const data = {
    totalHours: {
      current: currentHours,
      last: lastHours,
      percent: calculatePercentage(currentHours, lastHours),
    },
    activeWorkers: {
      current: currentWorkers,
      last: lastWorkers,
      percent: calculatePercentage(currentWorkers, lastWorkers),
    },
    activeProjects: {
      current: currentProjects,
      last: lastProjects,
      percent: calculatePercentage(currentProjects, lastProjects),
    },
  };
  return sendSuccess(res, "success", data, 200, true);
};

// approve weekly horus
// exports.approveHoursByWeekRange = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;
//   const { weekRange, worker_id, type } = req.body;
//   console.log(weekRange);
//   if (!tenantId) {
//     return next(new AppError("Tenant Id missing", 400));
//   }

//   if (!weekRange || !weekRange.startDate || !weekRange.endDate) {
//     return next(new AppError("Week range missing", 400));
//   }

//   /* ---------- PARSE WEEK RANGE ---------- */
//   const weekStart = new Date(weekRange.startDate);
//   weekStart.setHours(0, 0, 0, 0);

//   const weekEnd = new Date(weekRange.endDate);
//   weekEnd.setHours(23, 59, 59, 999);

//   /* ---------- UPDATE HOURS ---------- */
//   const result = await hoursModel.updateMany(
//     {
//       tenantId,
//       workerId: worker_id,
//       "project.project_date": {
//         $gte: weekStart,
//         $lte: weekEnd,
//       },
//     },
//     {
//       $set: {
//         status: type,
//         updatedAt: new Date(),
//       },
//     },
//     { new: true, runValidators: true },
//   );
//   if (result.modifiedCount === 0) {
//     return next(new AppError("Hours Not found In this week range", 400));
//   }
//   return sendSuccess(res, `Hours ${type} successfully`, {}, 200, true);
// });

exports.approveHoursByWeekRange = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { weekRange, worker_id, type } = req.body;

  if (!tenantId) {
    return next(new AppError("Tenant Id missing", 400));
  }

  if (!weekRange || !weekRange.startDate || !weekRange.endDate) {
    return next(new AppError("Week range missing", 400));
  }

  /* ---------- SAFE PARSER (D/M/YYYY or DD/MM/YYYY) ---------- */
  const parseDate = (dateString) => {
    const parts = dateString.split("/");
    if (parts.length !== 3) return null;

    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);

    const parsed = new Date(year, month - 1, day);

    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const weekStart = parseDate(weekRange.startDate);
  const weekEnd = parseDate(weekRange.endDate);

  if (!weekStart || !weekEnd) {
    return next(new AppError("Invalid week date format", 400));
  }

  weekStart.setHours(0, 0, 0, 0);
  weekEnd.setHours(23, 59, 59, 999);

  /* ---------- UPDATE HOURS ---------- */
  const result = await hoursModel.updateMany(
    {
      tenantId,
      workerId: new mongoose.Types.ObjectId(worker_id),
      "project.project_date": {
        $gte: weekStart,
        $lte: weekEnd,
      },
    },
    {
      $set: {
        status: type,
        updatedAt: new Date(),
      },
    },
  );

  if (result.modifiedCount === 0) {
    return next(new AppError("Hours Not found In this week range", 400));
  }

  return sendSuccess(res, `Hours ${type} successfully`, {}, 200, true);
});

// check sumbit hours on this date
exports.checkSubmitHoursOnDateForClientWorker = catchAsync(
  async (req, res, next) => {
    const requiredFields = ["project_id", "date"];
    let { tenantId, worker_id } = req;
    let { worker_ids } = req.body;
    for (let field of requiredFields) {
      if (!req.body[field] || req.body[field].toString().trim().length === 0) {
        return next(new AppError(`${field} required`, 400));
      }
    }

    const { project_id, date } = req.body;
    if (!tenantId || !isValidCustomUUID(tenantId)) {
      return next(new AppError("Missing Tenant-id or invalid", 400));
    }
    if (!worker_id || worker_ids) {
      worker_id = worker_ids;
    }
    if (!worker_id || !mongoose.Types.ObjectId.isValid(worker_id)) {
      return next(new AppError("Invalid worker or missing", 400));
    }
    /* 🔥 DATE FIX START */
    const inputDate = new Date(date);
    // start of day (IST)
    const startOfDay = new Date(
      inputDate.getFullYear(),
      inputDate.getMonth(),
      inputDate.getDate(),
    );
    // end of day (IST)
    const endOfDay = new Date(
      inputDate.getFullYear(),
      inputDate.getMonth(),
      inputDate.getDate() + 1,
    );
    /* 🔥 DATE FIX END */

    const payload = {
      tenantId,
      workerId: worker_id,
      "project.projectId": new mongoose.Types.ObjectId(project_id),
      "project.project_date": {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    };

    const submit_hours = await hoursModel
      .findOne(payload)
      .populate({
        path: "project.projectId",
        select: "project_details.project_name",
      })
      .select("project start_working_hours finish_hours day_off")
      .lean();

    if (!submit_hours) {
      return sendSuccess(res, "success", {}, 200, false);
    }
    const filterData = {
      project_name:
        submit_hours?.project.projectId?.project_details?.project_name,
      date: submit_hours?.day_off
        ? "Day Off"
        : `${
            new Date()
              ?.toLocaleString(submit_hours?.project?.project_date)
              ?.split(",")[0]
          } from ${submit_hours?.start_working_hours?.hours}:${submit_hours?.start_working_hours?.minutes} to ${submit_hours.finish_hours.hours}:${submit_hours.finish_hours.minutes}`,
    };
    return sendSuccess(res, "success", filterData, 200, true);
  },
);

// <------------- Weekly Time Sheet Start --------------->

// exports.weeklyTimeSheetGenerate = catchAsync(async (req, res, next) => {
//   const { tenantId, client_id, admin_id } = req;

//   /* ---------- TENANT VALIDATION ---------- */
//   if (!tenantId) {
//     return next(new AppError("Tenant-id missing in the request", 400));
//   }
//   if (!isValidCustomUUID(tenantId)) {
//     return next(new AppError("Invalid Tenant-id", 400));
//   }

//   /* ---------- CLIENT / ADMIN VALIDATION ---------- */
//   if (client_id && !mongoose.Types.ObjectId.isValid(client_id)) {
//     return next(new AppError("Invalid Client Credentials", 400));
//   }

//   if (admin_id && !mongoose.Types.ObjectId.isValid(admin_id)) {
//     return next(new AppError("Invalid Admin Credentials", 400));
//   }

//   /* ---------- BODY VALIDATION ---------- */
//   const { p_id, w_id, status, date } = req.body;

//   if (!p_id || !mongoose.Types.ObjectId.isValid(p_id)) {
//     return next(new AppError("Invalid Project Id", 400));
//   }

//   if (!Array.isArray(w_id) || w_id.length === 0) {
//     return next(new AppError("Worker Ids missing", 400));
//   }

//   if (!status) {
//     return next(new AppError("Status missing", 400));
//   }

//   if (!date || !date.start || !date.end) {
//     return next(new AppError("Date range missing", 400));
//   }

//   /* ---------- QUERY (FIXED DATE RANGE) ---------- */
//   const hoursData = await hoursModel.find({
//     tenantId,
//     workerId: { $in: w_id },
//     "project.projectId": p_id,
//     status,
//     "project.project_date": {
//       $gte: new Date(date.start),
//       $lte: new Date(date.end),
//     },
//   });

//   /* ---------- RESPONSE ---------- */
//   return res.status(200).json({
//     status: "success",
//     results: hoursData.length,
//     data: hoursData,
//   });
// });

// <-----------weekly time sheet --------------------->

// exports.weeklyTimeSheetGenerate = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;
//   const { p_id, w_id, status, date } = req.body;
//   if (!tenantId) return next(new AppError("Tenant-id missing", 400));
//   if (!Array.isArray(p_id) || !p_id.length)
//     return next(new AppError("Invalid Project Id", 400));
//   if (!Array.isArray(w_id) || !w_id.length)
//     return next(new AppError("Worker Ids missing", 400));
//   if (!status) return next(new AppError("Status missing", 400));
//   if (!date?.start || !date?.end)
//     return next(new AppError("Date range missing", 400));

//   /* ---------- DATE RANGE ---------- */

//   const startDate = new Date(date.start);
//   startDate.setHours(0, 0, 0, 0);

//   const endDate = new Date(date.end);
//   endDate.setHours(23, 59, 59, 999);

//   /* ---------- DB FETCH ---------- */

//   const [hoursData, projectData, organization] = await Promise.all([
//     // 🔥 aggregation instead of populate
//     hoursModel.aggregate([
//       {
//         $match: {
//           tenantId,
//           workerId: { $in: w_id.map((id) => new mongoose.Types.ObjectId(id)) },
//           "project.projectId": {
//             $in: p_id.map((id) => new mongoose.Types.ObjectId(id)),
//           },
//           status,
//           "project.project_date": { $gte: startDate, $lte: endDate },
//         },
//       },

//       // Worker join
//       {
//         $lookup: {
//           from: "workers",
//           localField: "workerId",
//           foreignField: "_id",
//           as: "worker",
//         },
//       },
//       { $unwind: "$worker" },

//       // Position join
//       {
//         $lookup: {
//           from: "worker_positions",
//           localField: "worker.worker_position",
//           foreignField: "_id",
//           as: "position",
//         },
//       },

//       {
//         $project: {
//           workerId: 1,
//           project: 1,
//           weekNumber: 1,
//           status: 1,
//           start_working_hours: 1,
//           finish_hours: 1,
//           total_hours: 1,

//           worker_personal_details: "$worker.worker_personal_details",
//           worker_signature: "$worker.signature",
//           worker_position: {
//             $arrayElemAt: ["$position.position", 0],
//           },
//         },
//       },
//     ]),

//     // project + client
//     projectMode
//       .findOne({ _id: p_id[0], tenantId })
//       .populate({
//         path: "client_details.client",
//         select: "client_details clientSignature",
//       })
//       .select(
//         "project_details.project_name client_details project_details_for_workers.description",
//       )
//       .lean(),

//     adminModel.findOne({ tenantId }).select("company_name").lean(),
//   ]);

//   if (!hoursData?.length) {
//     return res.status(200).json({
//       status: "success",
//       message: "Report data not found",
//       pdfUrl: null,
//     });
//   }

//   /* ---------- GROUP BY WORKER (Faster Map) ---------- */

//   const workerMap = new Map();

//   for (const item of hoursData) {
//     const workerId = item.workerId.toString();

//     if (!workerMap.has(workerId)) {
//       workerMap.set(workerId, {
//         contractor: organization.company_name,
//         client: {
//           name: projectData.client_details.client.client_details.client_name,
//           project_name: projectData.project_details.project_name,
//           signature: projectData.client_details.client.clientSignature,
//         },
//         worker_details: {
//           ...item.worker_personal_details,
//           signature: item.worker_signature,
//           position: item.worker_position || "",
//         },
//         hours_data: [],
//       });
//     }

//     workerMap.get(workerId).hours_data.push({
//       project: item.project,
//       weekNumber: item.weekNumber,
//       task: projectData.project_details_for_workers.description,
//       status: item.status,
//       start_working_hours: item.start_working_hours,
//       finish_hours: item.finish_hours,
//       total_hours: item.total_hours,
//     });
//   }

//   const groupedData = [...workerMap.values()];

//   /* ---------- HTML BUILD (Optimized) ---------- */

//   const template = await fs.promises.readFile(
//     path.join(process.cwd(), "src/templates/weeklyTimeSheet.html"),
//     "utf8",
//   );
//   const showSignature = status === "approved";

//   const pagesHtml = groupedData
//     .map((worker) => {
//       let total = 0;

//       const rows = worker.hours_data
//         .map((h) => {
//           total += h.total_hours;

//           return `
//           <tr>
//             <td>${new Date(h.project.project_date).toLocaleDateString()}</td>
//             <td>${h.task}</td>
//             <td>${worker.worker_details.position}</td>
//             <td>${h.start_working_hours.hours}:${h.start_working_hours.minutes}</td>
//             <td>${h.finish_hours.hours}:${h.finish_hours.minutes}</td>
//             <td>${h.total_hours}</td>
//           </tr>`;
//         })
//         .join("");

//       return `
//       <div class="page">
//         <h1>Weekly time sheet</h1>

//         <div class="row">
//           <div>Contractor: ${worker.contractor}</div>
//           <div>Client: ${worker.client.name}</div>
//         </div>

//         <div class="row">
//           <div>Project: ${worker.client.project_name}</div>
//         </div>

//         <div class="box-row">
//           <div class="box">First name: ${worker.worker_details.firstName}</div>
//           <div class="box">Last name: ${worker.worker_details.lastName}</div>
//           <div class="box">Week nr: ${worker.hours_data[0].weekNumber}</div>
//         </div>

//         <table>
//           <thead>
//             <tr>
//               <th>Date</th>
//               <th>Task description</th>
//               <th>Job Name</th>
//               <th>Time Started</th>
//               <th>Time stopped</th>
//               <th>Time total</th>
//             </tr>
//           </thead>
//           <tbody>${rows}</tbody>
//         </table>

//         <div class="total-box">
//           <strong>Total:</strong>
//           <div class="total-value">${total.toFixed(2)}</div>
//         </div>

//         <div class="sign-row">
//           <div>
//             <div class="line">
//               ${
//                 showSignature && worker.worker_details.signature
//                   ? `<img src="${worker.worker_details.signature}" class="signature-img" />`
//                   : ""
//               }
//               Employee:
//             </div>
//           </div>

//           <div>
//             <div class="line">
//               ${
//                 showSignature && worker.client.signature
//                   ? `<img src="${worker.client.signature}" class="signature-img" />`
//                   : ""
//               }
//               Supervisor:
//             </div>
//           </div>
//         </div>
//       </div>`;
//     })
//     .join("");

//   const finalHtml = template.replace("{{PAGES}}", pagesHtml);
//   const pdfBuffer = await generateTimesheetPDFBuffer(finalHtml);

//   res.set({
//     "Content-Type": "application/pdf",
//     "Content-Disposition": "inline; filename=weekly_timesheet.pdf",
//   });

//   return res.status(200).send(pdfBuffer);
// });

// exports.weeklyTimeSheetGenerate = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;
//   const { p_id, w_id, status, date } = req.body;

//   if (!tenantId) return next(new AppError("Tenant-id missing", 400));
//   if (!Array.isArray(p_id) || !p_id.length)
//     return next(new AppError("Invalid Project Id", 400));
//   if (!Array.isArray(w_id) || !w_id.length)
//     return next(new AppError("Worker Ids missing", 400));
//   if (!status) return next(new AppError("Status missing", 400));
//   if (!date?.start || !date?.end)
//     return next(new AppError("Date range missing", 400));

//   /* ---------- DATE RANGE ---------- */

//   const startDate = new Date(date.start);
//   startDate.setHours(0, 0, 0, 0);

//   const endDate = new Date(date.end);
//   endDate.setHours(23, 59, 59, 999);

//   /* ---------- DB FETCH ---------- */

//   const [hoursData, projectData, organization] = await Promise.all([
//     hoursModel.aggregate([
//       {
//         $match: {
//           tenantId,
//           workerId: { $in: w_id.map((id) => new mongoose.Types.ObjectId(id)) },
//           "project.projectId": {
//             $in: p_id.map((id) => new mongoose.Types.ObjectId(id)),
//           },
//           status,
//           "project.project_date": { $gte: startDate, $lte: endDate },
//         },
//       },

//       /* ---------- WORKER JOIN ---------- */
//       {
//         $lookup: {
//           from: "workers",
//           localField: "workerId",
//           foreignField: "_id",
//           as: "worker",
//         },
//       },
//       { $unwind: "$worker" },

//       /* ---------- POSITION JOIN ---------- */
//       {
//         $lookup: {
//           from: "worker_positions",
//           localField: "worker.worker_position",
//           foreignField: "_id",
//           as: "position",
//         },
//       },

//       /* ---------- FINAL PROJECT ---------- */
//       {
//         $project: {
//           workerId: 1,
//           project: 1,
//           status: 1,
//           start_working_hours: 1,
//           finish_hours: 1,
//           total_hours: 1,

//           // ✅ IMPORTANT
//           worker_createdAt: "$worker.createdAt",

//           worker_personal_details: "$worker.worker_personal_details",
//           worker_signature: "$worker.signature",
//           worker_position: {
//             $arrayElemAt: ["$position.position", 0],
//           },
//         },
//       },
//     ]),

//     projectMode
//       .findOne({ _id: p_id[0], tenantId })
//       .populate({
//         path: "client_details.client",
//         select: "client_details clientSignature",
//       })
//       .select(
//         "project_details.project_name client_details project_details_for_workers.description",
//       )
//       .lean(),

//     adminModel.findOne({ tenantId }).select("company_name").lean(),
//   ]);

//   if (!hoursData?.length) {
//     return res.status(200).json({
//       status: "success",
//       message: "Report data not found",
//       pdfUrl: null,
//     });
//   }

//   /* ---------- GROUP BY WORKER ---------- */

//   const workerMap = new Map();

//   for (const item of hoursData) {
//     const workerId = item.workerId.toString();

//     if (!workerMap.has(workerId)) {
//       workerMap.set(workerId, {
//         contractor: organization.company_name,
//         client: {
//           name: projectData.client_details.client.client_details.client_name,
//           project_name: projectData.project_details.project_name,
//           signature: projectData.client_details.client.clientSignature,
//         },
//         worker_details: {
//           ...item.worker_personal_details,
//           signature: item.worker_signature,
//           position: item.worker_position || "",
//         },
//         hours_data: [],
//       });
//     }

//     workerMap.get(workerId).hours_data.push({
//       project: item.project,

//       // ✅ DYNAMIC WEEK NUMBER
//       weekNumber: getWeeksCreated(item.worker_createdAt, startDate),

//       task: projectData.project_details_for_workers.description,
//       status: item.status,
//       start_working_hours: item.start_working_hours,
//       finish_hours: item.finish_hours,
//       total_hours: item.total_hours,
//     });
//   }

//   const groupedData = [...workerMap.values()];

//   /* ---------- HTML BUILD ---------- */

//   const template = await fs.promises.readFile(
//     path.join(process.cwd(), "src/templates/weeklyTimeSheet.html"),
//     "utf8",
//   );

//   const showSignature = status === "approved";

//   const pagesHtml = groupedData
//     .map((worker) => {
//       let total = 0;

//       const rows = worker.hours_data
//         .map((h) => {
//           total += h.total_hours;

//           return `
//           <tr>
//             <td>${new Date(h.project.project_date).toLocaleDateString()}</td>
//             <td>${h.task}</td>
//             <td>${worker.worker_details.position}</td>
//             <td>${h.start_working_hours.hours}:${h.start_working_hours.minutes}</td>
//             <td>${h.finish_hours.hours}:${h.finish_hours.minutes}</td>
//             <td>${h.total_hours}</td>
//           </tr>`;
//         })
//         .join("");

//       return `
//       <div class="page">
//         <h1>Weekly time sheet</h1>

//         <div class="row">
//           <div>Contractor: ${worker.contractor}</div>
//           <div>Client: ${worker.client.name}</div>
//         </div>

//         <div class="row">
//           <div>Project: ${worker.client.project_name}</div>
//         </div>

//         <div class="box-row">
//           <div class="box">First name: ${worker.worker_details.firstName}</div>
//           <div class="box">Last name: ${worker.worker_details.lastName}</div>
//           <div class="box">Week nr: ${worker.hours_data[0].weekNumber}</div>
//         </div>

//         <table>
//           <thead>
//             <tr>
//               <th>Date</th>
//               <th>Task description</th>
//               <th>Job Name</th>
//               <th>Time Started</th>
//               <th>Time stopped</th>
//               <th>Time total</th>
//             </tr>
//           </thead>
//           <tbody>${rows}</tbody>
//         </table>

//         <div class="total-box">
//           <strong>Total:</strong>
//           <div class="total-value">${total.toFixed(2)}</div>
//         </div>

//         <div class="sign-row">
//           <div>
//             <div class="line">
//               ${
//                 showSignature && worker.worker_details.signature
//                   ? `<img src="${worker.worker_details.signature}" class="signature-img" />`
//                   : ""
//               }
//               Employee:
//             </div>
//           </div>

//           <div>
//             <div class="line">
//               ${
//                 showSignature && worker.client.signature
//                   ? `<img src="${worker.client.signature}" class="signature-img" />`
//                   : ""
//               }
//               Supervisor:
//             </div>
//           </div>
//         </div>
//       </div>`;
//     })
//     .join("");

//   const finalHtml = template.replace("{{PAGES}}", pagesHtml);
//   const pdfBuffer = await generateTimesheetPDFBuffer(finalHtml);

//   res.set({
//     "Content-Type": "application/pdf",
//     "Content-Disposition": "inline; filename=weekly_timesheet.pdf",
//   });

//   return res.status(200).send(pdfBuffer);
// });

exports.weeklyTimeSheetGenerate = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { p_id, w_id, status, date } = req.body;

  if (!tenantId) return next(new AppError("Tenant-id missing", 400));
  if (!Array.isArray(p_id) || !p_id.length)
    return next(new AppError("Invalid Project Id", 400));
  if (!Array.isArray(w_id) || !w_id.length)
    return next(new AppError("Worker Ids missing", 400));
  if (!status) return next(new AppError("Status missing", 400));
  if (!date?.start || !date?.end)
    return next(new AppError("Date range missing", 400));

  /* ---------- DATE RANGE ---------- */
  console.log(date);
  const startDate = new Date(date.start);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(date.end);
  endDate.setHours(23, 59, 59, 999);

  /* ---------- DB FETCH ---------- */

  const [hoursData, projectData, organization] = await Promise.all([
    hoursModel.aggregate([
      {
        $match: {
          tenantId,
          workerId: { $in: w_id.map((id) => new mongoose.Types.ObjectId(id)) },
          "project.projectId": {
            $in: p_id.map((id) => new mongoose.Types.ObjectId(id)),
          },
          status,
          "project.project_date": { $gte: startDate, $lte: endDate },
        },
      },

      /* ---------- WORKER JOIN ---------- */
      {
        $lookup: {
          from: "workers",
          localField: "workerId",
          foreignField: "_id",
          as: "worker",
        },
      },
      { $unwind: "$worker" },

      /* ---------- POSITION JOIN ---------- */
      {
        $lookup: {
          from: "worker_positions",
          localField: "worker.worker_position",
          foreignField: "_id",
          as: "position",
        },
      },

      /* ---------- FINAL PROJECT ---------- */
      {
        $project: {
          workerId: 1,
          project: 1,
          status: 1,
          start_working_hours: 1,
          finish_hours: 1,
          total_hours: 1,

          // ✅ IMPORTANT
          worker_createdAt: "$worker.createdAt",

          worker_personal_details: "$worker.worker_personal_details",
          worker_signature: "$worker.signature",
          worker_position: {
            $arrayElemAt: ["$position.position", 0],
          },
        },
      },
    ]),

    projectMode
      .findOne({ _id: p_id[0], tenantId })
      .populate({
        path: "client_details.client",
        select: "client_details clientSignature",
      })
      .select(
        "project_details.project_name client_details project_details_for_workers.description",
      )
      .lean(),

    adminModel.findOne({ tenantId }).select("company_name").lean(),
  ]);

  if (!hoursData?.length) {
    return res.status(200).json({
      status: "success",
      message: "Report data not found",
      pdfUrl: null,
    });
  }

  /* ---------- GROUP BY WORKER ---------- */

  const workerMap = new Map();

  for (const item of hoursData) {
    const workerId = item.workerId.toString();

    if (!workerMap.has(workerId)) {
      workerMap.set(workerId, {
        contractor: organization.company_name,
        client: {
          name:
            projectData?.client_details?.client?.client_details?.client_name ||
            "",
          project_name: projectData?.project_details?.project_name,
          signature: projectData?.client_details?.client?.clientSignature,
        },
        worker_details: {
          ...item.worker_personal_details,
          signature: item.worker_signature,
          position: item.worker_position || "",
        },
        hours_data: [],
      });
    }

    workerMap.get(workerId).hours_data.push({
      project: item.project,

      // ✅ DYNAMIC WEEK NUMBER
      weekNumber: getWeeksCreated(item.worker_createdAt, startDate),

      task: projectData.project_details_for_workers.description,
      status: item.status,
      start_working_hours: item.start_working_hours,
      finish_hours: item.finish_hours,
      total_hours: item.total_hours,
    });
  }

  const groupedData = [...workerMap.values()];

  /* ---------- HTML BUILD ---------- */

  const template = await fs.promises.readFile(
    path.join(process.cwd(), "src/templates/weeklyTimeSheet.html"),
    "utf8",
  );

  const showSignature = status === "approved";

  const pagesHtml = groupedData
    .map((worker) => {
      let total = 0;

      const rows = worker.hours_data
        .map((h) => {
          total += h.total_hours;

          return `
          <tr>
            <td>${new Date(h.project.project_date).toLocaleDateString()}</td>
            <td>${h.task}</td>
            <td>${worker.worker_details.position}</td>
            <td>${h.start_working_hours.hours}:${h.start_working_hours.minutes}</td>
            <td>${h.finish_hours.hours}:${h.finish_hours.minutes}</td>
            <td>${h.total_hours}</td>
          </tr>`;
        })
        .join("");

      return `
      <div class="page">
        <h1>Weekly time sheet</h1>

        <div class="row">
          <div>Contractor: ${worker.contractor}</div>
          <div>Client: ${worker.client.name}</div>
        </div>

        <div class="row">
          <div>Project: ${worker.client.project_name}</div>
        </div>

        <div class="box-row">
          <div class="box">First name: ${worker.worker_details.firstName}</div>
          <div class="box">Last name: ${worker.worker_details.lastName}</div>
          <div class="box">Week nr: ${worker.hours_data[0].weekNumber}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Task description</th>
              <th>Job Name</th>
              <th>Time Started</th>
              <th>Time stopped</th>
              <th>Time total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="total-box">
          <strong>Total:</strong>
          <div class="total-value">${total.toFixed(2)}</div>
        </div>

        <div class="sign-row">
          <div>
            <div class="line">
              ${
                showSignature && worker.worker_details.signature
                  ? `<img src="${worker.worker_details.signature}" class="signature-img" />`
                  : ""
              }
              Employee:
            </div>
          </div>

          <div>
            <div class="line">
              ${
                showSignature && worker.client.signature
                  ? `<img src="${worker.client.signature}" class="signature-img" />`
                  : ""
              }
              Supervisor:
            </div>
          </div>
        </div>
      </div>`;
    })
    .join("");

  const finalHtml = template.replace("{{PAGES}}", pagesHtml);
  const pdfBuffer = await generateTimesheetPDFBuffer(finalHtml);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": "inline; filename=weekly_timesheet.pdf",
  });

  return res.status(200).send(pdfBuffer);
});

// <----------- worker project hours for excel sheet start ----------->
// helping function

function generateDateRange(startDate, endDate) {
  const dates = [];
  let current = new Date(startDate);
  const last = new Date(endDate);

  while (current <= last) {
    dates.push(
      current.toLocaleDateString("en-CA", {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    );

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

exports.workerAllProjectHoursDataForExcel = catchAsync(
  async (req, res, next) => {
    const { tenantId } = req;
    const { p_id } = req.body;

    if (!tenantId) return next(new AppError("Tenant-id missing", 400));

    if (!Array.isArray(p_id) || p_id.length === 0)
      return next(new AppError("Project Required", 400));

    const objectProjectIds = p_id.map((id) => new mongoose.Types.ObjectId(id));

    /* ---------------- GET DATA ---------------- */

    const hoursData = await hoursModel.aggregate([
      {
        $match: {
          tenantId,
          "project.projectId": { $in: objectProjectIds },
        },
      },
      {
        $lookup: {
          from: "workers",
          localField: "workerId",
          foreignField: "_id",
          as: "worker",
        },
      },
      { $unwind: "$worker" },
      {
        $project: {
          workerName: {
            $trim: {
              input: {
                $concat: [
                  "$worker.worker_personal_details.firstName",
                  " ",
                  "$worker.worker_personal_details.lastName",
                ],
              },
            },
          },
          projectDate: "$project.project_date", // ✅ RAW DATE
          total_hours: 1,
        },
      },
    ]);

    if (!hoursData.length) {
      return sendSuccess(
        res,
        "success",
        {
          startDate: null,
          endDate: null,
          workers: [],
        },
        200,
        true,
      );
    }

    /* ---------------- FORMAT DATES (BROWSER TIMEZONE) ---------------- */

    const formattedRows = hoursData.map((row) => {
      const formattedDate = new Date(row.projectDate).toLocaleDateString(
        "en-CA",
        {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      );

      return {
        ...row,
        projectDate: formattedDate,
      };
    });

    const allDates = formattedRows.map((d) => d.projectDate).sort();

    const minDate = allDates[0];
    const maxDate = allDates[allDates.length - 1];

    const dateRange = generateDateRange(minDate, maxDate);

    /* ---------------- PIVOT ---------------- */

    const workerMap = new Map();

    for (const row of formattedRows) {
      if (!workerMap.has(row.workerName)) {
        const dateObj = {};
        dateRange.forEach((d) => (dateObj[d] = null));

        workerMap.set(row.workerName, {
          name: row.workerName,
          hoursByDate: dateObj,
        });
      }

      workerMap.get(row.workerName).hoursByDate[row.projectDate] =
        row.total_hours;
    }

    const workers = Array.from(workerMap.values());

    const finalData = {
      startDate: minDate,
      endDate: maxDate,
      workers,
    };

    return sendSuccess(res, "success", finalData, 200, true);
  },
);

// <----------- worker project hours for excel sheet end ----------->

// exports.getAllHoursOfWorkerController = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;

//   /* ---------- TENANT VALIDATION ---------- */
//   if (!tenantId) {
//     return next(new AppError("Tenant Id missing in headers", 400));
//   }

//   if (!isValidCustomUUID(tenantId)) {
//     return next(new AppError("Invalid Tenant-Id", 400));
//   }

//   /* ---------- PAGINATION ---------- */
//   const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
//   const limit =
//     Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;
//   const skip = (page - 1) * limit;

//   /* ---------- CURRENT WEEK (MON–SUN) ---------- */
//   const today = new Date();
//   const day = today.getDay() === 0 ? 7 : today.getDay();

//   const weekStart = new Date(today);
//   weekStart.setDate(today.getDate() - day + 1);
//   weekStart.setHours(0, 0, 0, 0);

//   const weekEnd = new Date(weekStart);
//   weekEnd.setDate(weekStart.getDate() + 6);
//   weekEnd.setHours(23, 59, 59, 999);

//   /* ---------- BUILD QUERY ---------- */
//   const query = { tenantId };

//   /* DATE FILTER */
//   if (Array.isArray(req.body?.date) && req.body?.date.length > 0) {
//     const startDate = new Date(req.body.date[0]);
//     const endDate = new Date(req.body.date[1]);

//     const startOfDay = new Date(startDate);
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date(endDate);
//     endOfDay.setHours(23, 59, 59, 999);

//     query.createdAt = { $gte: startOfDay, $lte: endOfDay };
//   } else {
//     query.createdAt = { $gte: weekStart, $lte: weekEnd };
//   }

//   /* STATUS FILTER */
//   if (req.body?.status) {
//     query.status = req.body.status;
//   }

//   /* WORKER FILTER */
//   if (Array.isArray(req.body?.workerIds) && req.body.workerIds.length > 0) {
//     query.workerId = {
//       $in: req.body.workerIds.map((id) => new mongoose.Types.ObjectId(id)),
//     };
//   }

//   /* PROJECT FILTER */
//   if (Array.isArray(req.body?.projectIds) && req.body.projectIds.length > 0) {
//     query["project.projectId"] = {
//       $in: req.body.projectIds.map((id) => new mongoose.Types.ObjectId(id)),
//     };
//   }

//   /* ---------- FETCH DATA ---------- */
//   const hoursData = await hoursModel
//     .find(query)
//     .populate([
//       {
//         path: "project.projectId",
//         select: "project_details.project_name",
//       },
//       {
//         path: "workerId",
//         select:
//           "worker_personal_details.firstName worker_personal_details.lastName worker_position personal_information.documents.profile_picture",
//         populate: {
//           path: "worker_position",
//           select: "position",
//         },
//       },
//     ])
//     .sort({ createdAt: -1 })
//     .lean();

//   /* ---------- WORKER MAP (LATEST + TOTAL HOURS + LATE CHECK) ---------- */
//   const workerMap = new Map();

//   for (const item of hoursData) {
//     const workerKey = item.workerId?._id?.toString();
//     if (!workerKey) continue;

//     const lateResult = calculateLateHoursByDate({
//       projectDate: item.project?.project_date,
//       createdAt: item.createdAt,
//       dayOff: item.day_off,
//       graceMinutes: 0,
//     });

//     if (!workerMap.has(workerKey)) {
//       workerMap.set(workerKey, {
//         latest: item,
//         total_hours_sum: Number(item.total_hours || 0),
//         is_late: lateResult.isLate,
//         late_minutes: lateResult.lateMinutes,
//         late_time: lateResult.lateTime,
//       });
//     } else {
//       const existing = workerMap.get(workerKey);

//       //  per worker total hours sum
//       existing.total_hours_sum += Number(item.total_hours || 0);

//       // late logic unchanged
//       if (lateResult.isLate) {
//         existing.is_late = true;

//         if (lateResult.lateMinutes > existing.late_minutes) {
//           existing.late_minutes = lateResult.lateMinutes;
//           existing.late_time = lateResult.lateTime;
//         }
//       }
//     }
//   }

//   /* ---------- HOURS FORMATTER ---------- */
//   const formatHours = (decimalHours = 0) => {
//     const hours = Math.floor(decimalHours);
//     const minutes = Math.round((decimalHours - hours) * 60);

//     return {
//       decimal: decimalHours.toFixed(2),
//       hours,
//       minutes,
//       label: `${decimalHours.toFixed(2)} h (${hours}h ${minutes}min)`,
//     };
//   };

//   /* ---------- WEEK RANGE LABEL ---------- */
//   const formatWeekRangeLabel = (startDate, endDate) => {
//     const options = { day: "numeric", month: "short" };
//     return `${new Date(startDate).toLocaleDateString(
//       "en-IN",
//       options,
//     )} - ${new Date(endDate).toLocaleDateString(
//       "en-IN",
//       options,
//     )} ${new Date(endDate).getFullYear()}`;
//   };

//   /* ---------- TRANSFORM DATA ---------- */
//   const transformedData = Array.from(workerMap.values()).map(
//     ({ latest, total_hours_sum, is_late, late_minutes, late_time }) => ({
//       _id: latest._id,
//       tenantId: latest.tenantId,

//       worker: latest.workerId
//         ? {
//             _id: latest.workerId._id,
//             firstName: latest.workerId.worker_personal_details?.firstName || "",
//             lastName: latest.workerId.worker_personal_details?.lastName || "",
//             position: latest.workerId.worker_position?.[0]?.position || "",
//             profile_picture:
//               latest.workerId.personal_information.documents.profile_picture,
//           }
//         : null,

//       project: latest.project?.projectId
//         ? {
//             _id: latest.project.projectId._id,
//             project_name:
//               latest.project.projectId.project_details?.project_name || "",
//             project_date: latest.project.project_date,
//           }
//         : null,

//       weekNumber: latest.weekNumber,
//       status: latest.status,
//       start_working_hours: latest.start_working_hours,
//       finish_hours: latest.finish_hours,
//       break_time: latest.break_time,
//       comments: latest.comments,
//       image: latest.image,
//       createdAt: latest.createdAt,
//       updatedAt: latest.updatedAt,
//       createdBy: latest.createdBy || "",

//       // ✅ FINAL PER WORKER TOTAL HOURS
//       total_hours: formatHours(total_hours_sum),

//       lateReason: latest.lateReason,
//       is_late,
//       late_time,
//       late_minutes,

//       weekRange: {
//         startDate: weekStart.toISOString().split("T")[0],
//         endDate: weekEnd.toISOString().split("T")[0],
//         label: formatWeekRangeLabel(weekStart, weekEnd),
//       },
//     }),
//   );

//   /* ---------- PAGINATION ---------- */
//   const paginatedData = transformedData.slice(skip, skip + limit);

//   /* ---------- RESPONSE ---------- */
//   return sendSuccess(
//     res,
//     "Current week worker hours fetched successfully",
//     {
//       total: transformedData.length,
//       page,
//       limit,
//       totalPages: Math.ceil(transformedData.length / limit),
//       data: paginatedData,
//     },
//     200,
//     true,
//   );
// });

// <---------------- tesing ------------->

// exports.getAllHoursOfWorkerController = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;

//   /* ---------- TENANT VALIDATION ---------- */
//   if (!tenantId) {
//     return next(new AppError("Tenant Id missing in headers", 400));
//   }

//   if (!isValidCustomUUID(tenantId)) {
//     return next(new AppError("Invalid Tenant-Id", 400));
//   }

//   /* ---------- CURRENT + PREVIOUS 3 WEEKS ---------- */
//   const today = new Date();
//   const day = today.getDay() === 0 ? 7 : today.getDay();

//   const baseWeekStart = new Date(today);
//   baseWeekStart.setDate(today.getDate() - day + 1);
//   baseWeekStart.setHours(0, 0, 0, 0);

//   const weeks = [];

//   for (let i = 0; i <= 3; i++) {
//     const start = new Date(baseWeekStart);
//     start.setDate(baseWeekStart.getDate() - i * 7);
//     start.setHours(0, 0, 0, 0);

//     const end = new Date(start);
//     end.setDate(start.getDate() + 6);
//     end.setHours(23, 59, 59, 999);

//     weeks.push({ start, end });
//   }

//   /* ---------- BUILD QUERY ---------- */
//   const query = { tenantId };

//   query.createdAt = {
//     $gte: weeks[3].start,
//     $lte: weeks[0].end,
//   };

//   if (req.body?.status) {
//     query.status = req.body.status;
//   }

//   if (Array.isArray(req.body?.workerIds) && req.body.workerIds.length > 0) {
//     query.workerId = {
//       $in: req.body.workerIds.map((id) => new mongoose.Types.ObjectId(id)),
//     };
//   }

//   if (Array.isArray(req.body?.projectIds) && req.body.projectIds.length > 0) {
//     query["project.projectId"] = {
//       $in: req.body.projectIds.map((id) => new mongoose.Types.ObjectId(id)),
//     };
//   }

//   /* ---------- FETCH DATA ---------- */
//   const hoursData = await hoursModel
//     .find(query)
//     .populate([
//       {
//         path: "project.projectId",
//         select: "project_details.project_name",
//       },
//       {
//         path: "workerId",
//         select:
//           "worker_personal_details.firstName worker_personal_details.lastName worker_position personal_information.documents.profile_picture",
//         populate: {
//           path: "worker_position",
//           select: "position",
//         },
//       },
//     ])
//     .sort({ createdAt: -1 })
//     .lean();

//   /* ---------- FORMAT HOURS ---------- */
//   const formatHours = (decimalHours = 0) => {
//     const hours = Math.floor(decimalHours);
//     const minutes = Math.round((decimalHours - hours) * 60);

//     return {
//       decimal: decimalHours.toFixed(2),
//       hours,
//       minutes,
//       label: `${decimalHours.toFixed(2)} h (${hours}h ${minutes}min)`,
//     };
//   };

//   /* ---------- WEEK RANGE LABEL ---------- */
//   const formatWeekRangeLabel = (startDate, endDate) => {
//     const options = { day: "numeric", month: "short" };
//     return `${new Date(startDate).toLocaleDateString(
//       "en-IN",
//       options,
//     )} - ${new Date(endDate).toLocaleDateString(
//       "en-IN",
//       options,
//     )} ${new Date(endDate).getFullYear()}`;
//   };

//   /* ---------- WEEK BUCKETS ---------- */
//   const weekBuckets = [[], [], [], []];

//   for (const item of hoursData) {
//     const itemDate = new Date(item.createdAt);

//     const weekIndex = weeks.findIndex(
//       (w) => itemDate >= w.start && itemDate <= w.end,
//     );

//     if (weekIndex === -1) continue;

//     const lateResult = calculateLateHoursByDate({
//       projectDate: item.project?.project_date,
//       createdAt: item.createdAt,
//       dayOff: item.day_off,
//       graceMinutes: 0,
//     });

//     weekBuckets[weekIndex].push({
//       _id: item._id,
//       tenantId: item.tenantId,

//       worker: item.workerId
//         ? {
//             _id: item.workerId._id,
//             firstName: item.workerId.worker_personal_details?.firstName || "",
//             lastName: item.workerId.worker_personal_details?.lastName || "",
//             position: item.workerId.worker_position?.[0]?.position || "",
//             profile_picture:
//               item.workerId.personal_information?.documents?.profile_picture,
//           }
//         : null,

//       project: item.project?.projectId
//         ? {
//             _id: item.project.projectId._id,
//             project_name:
//               item.project.projectId.project_details?.project_name || "",
//             project_date: item.project.project_date,
//           }
//         : null,

//       total_hours: formatHours(Number(item.total_hours || 0)),
//       status: item.status,
//       createdAt: item.createdAt,
//       updatedAt: item.updatedAt,

//       is_late: lateResult.isLate,
//       late_time: lateResult.lateTime,
//       late_minutes: lateResult.lateMinutes,
//       weekRange: {
//         startDate: weeks[weekIndex].start,
//         endDate: weeks[weekIndex].end,
//         label: formatWeekRangeLabel(
//           weeks[weekIndex].start,
//           weeks[weekIndex].end,
//         ),
//       },
//     });
//   }

//   /* ---------- FINAL RESPONSE FORMAT ---------- */
//   const responseData = {
//     startDate: weeks[3].start,
//     endDate: weeks[0].end,
//     data: [
//       ...weekBuckets[0],
//       ...weekBuckets[1],
//       ...weekBuckets[2],
//       ...weekBuckets[3],
//     ],
//   };

//   return sendSuccess(
//     res,
//     "Week-wise worker hours fetched successfully",
//     responseData,
//     200,
//     true,
//   );
// });

exports.getAllHoursOfWorkerController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  /* ---------- TENANT VALIDATION ---------- */
  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

  /* ---------- PAGINATION ---------- */
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit =
    Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;

  const skip = (page - 1) * limit;

  /* ---------- CURRENT + PREVIOUS 3 WEEKS ---------- */
  const today = new Date();
  const day = today.getDay() === 0 ? 7 : today.getDay();

  const baseWeekStart = new Date(today);
  baseWeekStart.setDate(today.getDate() - day + 1);
  baseWeekStart.setHours(0, 0, 0, 0);

  const weeks = [];

  for (let i = 0; i <= 3; i++) {
    const start = new Date(baseWeekStart);
    start.setDate(baseWeekStart.getDate() - i * 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    weeks.push({ start, end });
  }

  /* ---------- BUILD QUERY (project_date based) ---------- */
  const query = { tenantId };

  query["project.project_date"] = {
    $gte: weeks[3].start,
    $lte: weeks[0].end,
  };

  if (req.body?.status) {
    query.status = req.body.status;
  }

  if (Array.isArray(req.body?.workerIds) && req.body.workerIds.length > 0) {
    query.workerId = {
      $in: req.body.workerIds.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  if (Array.isArray(req.body?.projectIds) && req.body.projectIds.length > 0) {
    query["project.projectId"] = {
      $in: req.body.projectIds.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  /* ---------- FETCH DATA ---------- */
  const hoursData = await hoursModel
    .find(query)
    .populate([
      {
        path: "project.projectId",
        select: "project_details.project_name",
      },
      {
        path: "workerId",
        select:
          "worker_personal_details.firstName worker_personal_details.lastName worker_position personal_information.documents.profile_picture createdAt",
        populate: {
          path: "worker_position",
          select: "position",
        },
      },
    ])
    .lean();

  /* ---------- HELPERS ---------- */
  const formatHours = (decimalHours = 0) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);

    return {
      decimal: decimalHours.toFixed(2),
      hours,
      minutes,
      label: `${decimalHours.toFixed(2)} h (${hours}h ${minutes}min)`,
    };
  };

  const formatWeekRangeLabel = (startDate, endDate) => {
    const options = { day: "numeric", month: "short" };
    return `${new Date(startDate).toLocaleDateString(
      "en-IN",
      options,
    )} - ${new Date(endDate).toLocaleDateString(
      "en-IN",
      options,
    )} ${new Date(endDate).getFullYear()}`;
  };

  /* ---------- WEEK + WORKER GROUPING ---------- */
  const transformedData = [];

  weeks.forEach((week) => {
    const workerMap = new Map();

    hoursData.forEach((item) => {
      const itemDate = new Date(item.project?.project_date);
      if (!item.project?.project_date) return;

      if (itemDate >= week.start && itemDate <= week.end) {
        const workerKey = item.workerId?._id?.toString();
        if (!workerKey) return;

        if (!workerMap.has(workerKey)) {
          workerMap.set(workerKey, {
            latest: item,
            total_hours_sum: Number(item.total_hours || 0),
          });
        } else {
          const existing = workerMap.get(workerKey);

          existing.total_hours_sum += Number(item.total_hours || 0);

          // 🔥 Compare using project_date
          if (
            new Date(item.project.project_date) >
            new Date(existing.latest.project.project_date)
          ) {
            existing.latest = item;
          }
        }
      }
    });

    workerMap.forEach(({ latest, total_hours_sum }) => {
      transformedData.push({
        _id: latest._id,
        tenantId: latest.tenantId,
        weekNumber: getWeeksSinceCreated(latest.workerId.createdAt, week.start),
        worker: latest.workerId
          ? {
              _id: latest.workerId._id,
              firstName:
                latest.workerId.worker_personal_details?.firstName || "",
              lastName: latest.workerId.worker_personal_details?.lastName || "",
              position: latest.workerId.worker_position?.[0]?.position || "",
              profile_picture:
                latest.workerId.personal_information?.documents
                  ?.profile_picture,
            }
          : null,

        project: latest.project?.projectId
          ? {
              _id: latest.project.projectId._id,
              project_name:
                latest.project.projectId.project_details?.project_name || "",
              project_date: latest.project.project_date,
            }
          : null,

        total_hours: formatHours(total_hours_sum),
        status: latest.status,
        createdAt: latest.createdAt,
        updatedAt: latest.updatedAt,
        break_time: latest.break_time,
        comments: latest.comments,
        weekRange: {
          startDate: week.start.toLocaleDateString("en-IN"),
          endDate: week.end.toLocaleDateString("en-IN"),
          label: formatWeekRangeLabel(week.start, week.end),
        },
      });
    });
  });

  /* ---------- PAGINATION ---------- */
  const total = transformedData.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedData = transformedData.slice(skip, skip + limit);

  /* ---------- RESPONSE ---------- */
  return sendSuccess(
    res,
    "Week-wise worker hours fetched successfully",
    {
      total,
      page,
      limit,
      totalPages,
      data: paginatedData,
    },
    200,
    true,
  );
});

//
exports.getSingleWorkerWeeklyHoursController = catchAsync(
  async (req, res, next) => {
    const { tenantId } = req;
    const { startDate, endDate, workerId } = req.body;
    const weekOffset = Number(req.query.weekOffset) || 0;

    /* ---------- VALIDATION ---------- */
    if (!tenantId)
      return next(new AppError("Tenant Id missing in headers", 400));

    if (!isValidCustomUUID(tenantId))
      return next(new AppError("Invalid Tenant-Id", 400));

    if (!workerId) return next(new AppError("Worker Id missing", 400));

    if (!startDate) return next(new AppError("Start date is required", 400));

    /* ---------- SAFE DATE PARSER (DD/MM/YYYY) ---------- */
    const parseDate = (dateString) => {
      const [day, month, year] = dateString.split("/").map(Number);
      return new Date(year, month - 1, day);
    };

    const baseDate = parseDate(startDate);
    const baseEnd = endDate ? parseDate(endDate) : parseDate(startDate);

    /* ---------- WEEK CALCULATION (MON–SUN) ---------- */
    const dayNumber = baseDate.getDay() === 0 ? 7 : baseDate.getDay();

    const weekStart = new Date(baseDate);
    weekStart.setDate(baseDate.getDate() - dayNumber + 1 - weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    /* ---------- AGGREGATION ---------- */
    const hoursData = await hoursModel.aggregate([
      {
        $match: {
          tenantId,
          workerId: new mongoose.Types.ObjectId(workerId),
          "project.project_date": {
            $gte: weekStart,
            $lte: weekEnd,
          },
        },
      },
      { $sort: { createdAt: 1 } },

      /* ---------- PROJECT LOOKUP ---------- */
      {
        $lookup: {
          from: "projects",
          localField: "project.projectId",
          foreignField: "_id",
          as: "projectDetails",
          pipeline: [
            {
              $project: {
                "project_details.project_name": 1,
                "project_details.project_location_address": 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* ---------- WORKER LOOKUP ---------- */
      {
        $lookup: {
          from: "workers",
          localField: "workerId",
          foreignField: "_id",
          as: "worker",
          pipeline: [
            {
              $project: {
                "worker_personal_details.firstName": 1,
                "worker_personal_details.lastName": 1,
                createdAt: 1,
                worker_position: 1,
                "personal_information.documents.profile_picture": 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$worker",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* ---------- POSITION LOOKUP ---------- */
      {
        $lookup: {
          from: "positions",
          localField: "worker.worker_position",
          foreignField: "_id",
          as: "worker.worker_position",
          pipeline: [{ $project: { position: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$worker.worker_position",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* ---------- FINAL PROJECT ---------- */
      {
        $project: {
          tenantId: 1,
          project: 1,
          total_hours: 1,
          createdAt: 1,
          start_working_hours: 1,
          finish_hours: 1,
          break_time: 1,
          day_off: 1,
          weekNumber: 1,
          status: 1,
          comments: 1,
          images: 1,
          createdBy: 1,
          lateReason: 1,

          worker: 1,
          projectDetails: 1,
        },
      },
    ]);

    /* ---------- HOURS FORMATTER ---------- */
    const formatHours = (decimalHours = 0) => {
      const hours = Math.floor(decimalHours);
      const minutes = Math.round((decimalHours - hours) * 60);
      return {
        decimal: decimalHours.toFixed(2),
        hours,
        minutes,
        label: `${decimalHours.toFixed(2)} h (${hours}h ${minutes}min)`,
      };
    };

    /* ---------- TRANSFORM DATA (🔥 FIXED) ---------- */
    const finalData = hoursData.map((obj) => {
      const lateResult = calculateLateByProjectEnd({
        projectDate: obj.project?.project_date,
        finishHours: obj.finish_hours,
        submittedAt: obj.createdAt,
        dayOff: obj.day_off,
        graceMinutes: 0,
      });

      return {
        _id: obj._id,
        date: obj.createdAt,
        /* ✅ WORKER (FIXED) */
        worker: obj.worker
          ? {
              _id: obj.worker._id,
              firstName: obj.worker.worker_personal_details?.firstName || "",
              lastName: obj.worker.worker_personal_details?.lastName || "",
              position: obj.worker.worker_position?.position || "",
              profile_picture:
                obj.worker.personal_information?.documents?.profile_picture ||
                "",
            }
          : null,

        /* ✅ PROJECT (FIXED) */
        project: obj.projectDetails
          ? {
              _id: obj.project?.projectId,
              project_name:
                obj.projectDetails.project_details?.project_name || "",
              project_date: obj.project?.project_date || "",
              address:
                obj.projectDetails.project_details?.project_location_address ||
                "",
            }
          : null,

        start_working_hours: obj.start_working_hours,
        finish_hours: obj.finish_hours,
        break_time: obj.break_time,
        day_off: obj.day_off,
        weekNumber: getWeeksSinceCreated(obj.createdAt, weekStart),
        status: obj.status,
        comments: obj.comments,
        image: obj.images,
        createdBy: obj.createdBy || "",
        total_hours: formatHours(obj.total_hours),
        weekRange: { startDate, endDate },
        lateReason: obj.lateReason,
        is_late: lateResult.isLate,
        late_time: lateResult.lateTime,
        late_minutes: lateResult.lateMinutes,
      };
    });

    return sendSuccess(
      res,
      "Worker weekly hours fetched successfully",
      finalData,
      200,
      true,
    );
  },
);
