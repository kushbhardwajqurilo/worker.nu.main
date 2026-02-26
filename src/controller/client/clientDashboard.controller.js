const { default: mongoose } = require("mongoose");
const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");
const clientModel = require("../../models/clientModel");
const projectMode = require("../../models/projectMode");
const { isValidCustomUUID } = require("custom-uuid-generator");
const hoursModel = require("../../models/hoursModel");
const calculateLateHoursByDate = require("../../utils/weekLateCount");
const calculateLateByProjectEnd = require("../../utils/calculateLate");
const getWeeksSinceCreated = require("../../utils/calculateWeekNo");
const getWeekNumberFromWeekStart = require("../../utils/calenderWeekNumber");
// <--------- Single client own details  ----------->

exports.getClientInformation = catchAsync(async (req, res, next) => {
  const { client_id } = req;
  if (!client_id || client_id.length === 0 || client_id === undefined) {
    return next(new AppError("client id missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(client_id)) {
    return next(new AppError("Invalid client ObjectId"));
  }

  const isClient = await clientModel
    .findOne({
      _id: client_id,
      isDelete: false,
    })
    .select("-client_url ");

  if (!isClient) {
    return next(new AppError("client not found", 400));
  }
  return sendSuccess(res, "Success", isClient, 200, true);
});

// <--------- Single client own details  ----------->

// <----get clients workers ---------->

exports.getClientWorkers = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { cli } = req.query;
  if (!tenantId || tenantId.length === 0) {
    return next(new AppError("tenant-id missing in the headers", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    return next(new AppError("Invalid tenantId", 400));
  }

  if (!cli || cli.length === 0) {
    return next(new AppError("client-id missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(cli)) {
    return next(new AppError("Invalid client id", 400));
  }

  const workers = await projectMode.findOne({ tenantId });
});
// <----get clients workers end ---------->

// <------ client signatue false true ----------->
// is sing cliend
exports.isClientSign = catchAsync(async (req, res, next) => {
  const { tenantId, client_id } = req;
  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  if (!client_id) {
    return next(new AppError("client Id missing in headers", 400));
  }

  const client = await clientModel.findOne({ _id: client_id, tenantId });
  // console.log(client);
  const data = {
    _id: client?._id,
    isSign: client?.isSignatured,
  };
  return sendSuccess(res, "success", data, 200, true);
});

// client workers
// exports.getAllHoursOfWorkerToClientController = catchAsync(
//   async (req, res, next) => {
//     const { tenantId, client_id } = req;
//     /* ---------- TENANT VALIDATION ---------- */
//     if (!tenantId) {
//       return next(new AppError("Tenant Id missing in headers", 400));
//     }

//     if (!isValidCustomUUID(tenantId)) {
//       return next(new AppError("Invalid Tenant-Id", 400));
//     }

//     /* ---------- PAGINATION ---------- */
//     const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
//     const limit =
//       Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;
//     const skip = (page - 1) * limit;

//     /* ---------- CURRENT WEEK (MON–SUN) ---------- */
//     const today = new Date();
//     const day = today.getDay() === 0 ? 7 : today.getDay();

//     const weekStart = new Date(today);
//     weekStart.setDate(today.getDate() - day + 1);
//     weekStart.setHours(0, 0, 0, 0);

//     const weekEnd = new Date(weekStart);
//     weekEnd.setDate(weekStart.getDate() + 6);
//     weekEnd.setHours(23, 59, 59, 999);

//     const client_project = await projectMode
//       .find({ tenantId, "client_details.client": client_id })
//       .select("project_workers.workers");
//     const workerIds = [];
//     client_project.forEach((val) =>
//       workerIds.push(...val?.project_workers.workers),
//     );
//     /* ---------- FETCH ONLY CURRENT WEEK DATA ---------- */
//     const hoursData = await hoursModel
//       .find({
//         tenantId,
//         workerId: { $in: workerIds },
//         createdAt: {
//           $gte: weekStart,
//           $lte: weekEnd,
//         },
//       })
//       .populate([
//         {
//           path: "project.projectId",
//           select: "project_details.project_name",
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

//     /* ---------- WORKER MAP (LATE CHECK) ---------- */
//     const workerMap = new Map();

//     for (const item of hoursData) {
//       const workerKey = item.workerId?._id?.toString();
//       if (!workerKey) continue;

//       const lateResult = calculateLateHoursByDate({
//         projectDate: item.project?.project_date,
//         finishHours: item.finish_hours,
//         submittedAt: item.createdAt,
//         dayOff: item.day_off,
//         graceMinutes: 0,
//       });

//       if (!workerMap.has(workerKey)) {
//         workerMap.set(workerKey, {
//           latest: item,
//           is_late: lateResult.isLate,
//           late_minutes: lateResult.lateMinutes,
//           late_time: lateResult.lateTime,
//         });
//       } else {
//         const existing = workerMap.get(workerKey);

//         if (lateResult.isLate) {
//           existing.is_late = true;

//           if (lateResult.lateMinutes > existing.late_minutes) {
//             existing.late_minutes = lateResult.lateMinutes;
//             existing.late_time = lateResult.lateTime;
//           }
//         }
//       }
//     }

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

//     /* ---------- WEEK RANGE LABEL ---------- */
//     const formatWeekRangeLabel = (startDate, endDate) => {
//       const options = { day: "numeric", month: "short" };
//       return `${new Date(startDate).toLocaleDateString(
//         "en-IN",
//         options,
//       )} - ${new Date(endDate).toLocaleDateString(
//         "en-IN",
//         options,
//       )} ${new Date(endDate).getFullYear()}`;
//     };

//     /* ---------- TRANSFORM DATA ---------- */
//     const transformedData = Array.from(workerMap.values()).map(
//       ({ latest, is_late, late_minutes, late_time }) => ({
//         _id: latest._id,
//         tenantId: latest.tenantId,

//         worker: latest.workerId
//           ? {
//               _id: latest.workerId._id,
//               firstName:
//                 latest.workerId.worker_personal_details?.firstName || "",
//               lastName: latest.workerId.worker_personal_details?.lastName || "",
//               position: latest.workerId.worker_position?.[0]?.position || "",
//               profile_picture:
//                 latest.workerId.personal_information.documents.profile_picture,
//             }
//           : null,

//         project: latest.project?.projectId
//           ? {
//               _id: latest.project.projectId._id,
//               project_name:
//                 latest.project.projectId.project_details?.project_name || "",
//               project_date: latest.project.project_date,
//             }
//           : null,

//         weekNumber: latest.weekNumber,
//         status: latest.status,
//         start_working_hours: latest.start_working_hours,
//         finish_hours: latest.finish_hours,
//         break_time: latest.break_time,
//         comments: latest.comments,
//         image: latest.image,
//         createdAt: latest.createdAt,
//         updatedAt: latest.updatedAt,
//         createdBy: latest.createdBy || "",
//         total_hours: formatHours(latest.total_hours),

//         // ✅ WORKER LEVEL LATE FLAG
//         is_late,
//         late_time,
//         late_minutes,

//         weekRange: {
//           startDate: weekStart.toISOString().split("T")[0],
//           endDate: weekEnd.toISOString().split("T")[0],
//           label: formatWeekRangeLabel(weekStart, weekEnd),
//         },
//       }),
//     );

//     /* ---------- PAGINATION ---------- */
//     const paginatedData = transformedData.slice(skip, skip + limit);

//     /* ---------- RESPONSE ---------- */
//     return sendSuccess(
//       res,
//       "Current week worker hours fetched successfully",
//       {
//         total: transformedData.length,
//         page,
//         limit,
//         totalPages: Math.ceil(transformedData.length / limit),
//         data: paginatedData,
//       },
//       200,
//       true,
//     );
//   },
// );

// exports.getAllHoursOfWorkerToClientController = catchAsync(
//   async (req, res, next) => {
//     const { tenantId, client_id } = req;

//     /* ---------- TENANT VALIDATION ---------- */
//     if (!tenantId) {
//       return next(new AppError("Tenant Id missing in headers", 400));
//     }

//     if (!isValidCustomUUID(tenantId)) {
//       return next(new AppError("Invalid Tenant-Id", 400));
//     }

//     /* ---------- PAGINATION (clamp values for safety) ---------- */
//     const page = Math.max(1, Number(req.query.page) || 1);
//     const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
//     const skip = (page - 1) * limit;

//     /* ---------- CURRENT WEEK (MON–SUN) ---------- */
//     const today = new Date();
//     const day = today.getDay() === 0 ? 7 : today.getDay();

//     const weekStart = new Date(today);
//     weekStart.setDate(today.getDate() - day + 1);
//     weekStart.setHours(0, 0, 0, 0);

//     const weekEnd = new Date(weekStart);
//     weekEnd.setDate(weekStart.getDate() + 6);
//     weekEnd.setHours(23, 59, 59, 999);

//     /* ---------- EFFICIENTLY GET UNIQUE WORKER IDs ---------- */
//     const workerIds = await projectMode.distinct("project_workers.workers", {
//       tenantId,
//       "client_details.client": client_id,
//     });

//     if (!workerIds.length) {
//       return sendSuccess(
//         res,
//         "No workers found for this client",
//         {
//           total: 0,
//           page,
//           limit,
//           totalPages: 0,
//           data: [],
//         },
//         200,
//         true,
//       );
//     }

//     /* ---------- FETCH MINIMAL DATA FOR CURRENT WEEK ---------- */
//     const hoursData = await hoursModel
//       .find({
//         tenantId,
//         workerId: { $in: workerIds },
//         createdAt: {
//           $gte: weekStart,
//           $lte: weekEnd,
//         },
//       })
//       .select(
//         [
//           "workerId",
//           "project.projectId",
//           "project.project_date",
//           "total_hours",
//           "createdAt",
//           "updatedAt",
//           "status",
//           "start_working_hours",
//           "finish_hours",
//           "break_time",
//           "comments",
//           "images",
//           "createdBy",
//           "weekNumber",
//           "day_off", // needed for late calc
//           "tenantId",
//         ].join(" "),
//       )
//       .populate({
//         path: "project.projectId",
//         select: "project_details.project_name _id",
//       })
//       .populate({
//         path: "workerId",
//         select:
//           "worker_personal_details.firstName worker_personal_details.lastName personal_information.documents.profile_picture worker_position _id",
//       })
//       .populate({
//         path: "workerId.worker_position",
//         select: "position",
//         // If worker_position is an array, use this to limit; otherwise adjust
//         options: { limit: 1 },
//       })
//       .sort({ createdAt: -1 }) // Global sort ensures first encounter per worker is the latest
//       .lean();

//     /* ---------- WORKER MAP: LATEST DOC + AGGREGATE LATE STATS ---------- */
//     const workerMap = new Map();

//     for (const item of hoursData) {
//       const workerKey = item.workerId?._id?.toString();
//       if (!workerKey) continue;

//       const lateResult = calculateLateHoursByDate({
//         projectDate: item.project?.project_date,
//         finishHours: item.finish_hours,
//         submittedAt: item.createdAt,
//         dayOff: item.day_off,
//         graceMinutes: 0,
//       });

//       if (!workerMap.has(workerKey)) {
//         workerMap.set(workerKey, {
//           latest: item,
//           is_late: lateResult.isLate,
//           late_minutes: lateResult.lateMinutes || 0,
//           late_time: lateResult.lateTime || null,
//         });
//       } else {
//         const existing = workerMap.get(workerKey);
//         if (lateResult.isLate) {
//           existing.is_late = true;
//           if (lateResult.lateMinutes > existing.late_minutes) {
//             existing.late_minutes = lateResult.lateMinutes;
//             existing.late_time = lateResult.lateTime;
//           }
//         }
//       }
//     }

//     /* ---------- HELPERS (unchanged) ---------- */
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

//     const formatWeekRangeLabel = (startDate, endDate) => {
//       const options = { day: "numeric", month: "short" };
//       return `${new Date(startDate).toLocaleDateString(
//         "en-IN",
//         options,
//       )} - ${new Date(endDate).toLocaleDateString(
//         "en-IN",
//         options,
//       )} ${new Date(endDate).getFullYear()}`;
//     };

//     /* ---------- TRANSFORM DATA (one per worker) ---------- */
//     const transformedData = Array.from(workerMap.values()).map(
//       ({ latest, is_late, late_minutes, late_time }) => ({
//         _id: latest._id,
//         tenantId: latest.tenantId,

//         worker: latest.workerId
//           ? {
//               _id: latest.workerId._id,
//               firstName:
//                 latest.workerId.worker_personal_details?.firstName || "",
//               lastName: latest.workerId.worker_personal_details?.lastName || "",
//               position:
//                 latest.workerId.worker_position?.[0]?.position || // original had array access
//                 latest.workerId.worker_position?.position ||
//                 "",
//               profile_picture:
//                 latest.workerId.personal_information?.documents
//                   ?.profile_picture || null,
//             }
//           : null,

//         project: latest.project?.projectId
//           ? {
//               _id: latest.project.projectId._id,
//               project_name:
//                 latest.project.projectId.project_details?.project_name || "",
//               project_date: latest.project.project_date,
//             }
//           : null,

//         weekNumber: latest.weekNumber,
//         status: latest.status,
//         start_working_hours: latest.start_working_hours,
//         finish_hours: latest.finish_hours,
//         break_time: latest.break_time,
//         comments: latest.comments,
//         image: latest.images,
//         createdAt: latest.createdAt,
//         updatedAt: latest.updatedAt,
//         createdBy: latest.createdBy || "",
//         total_hours: formatHours(latest.total_hours),

//         // Worker-level late aggregation
//         is_late,
//         late_time,
//         late_minutes,

//         weekRange: {
//           startDate: weekStart.toISOString().split("T")[0],
//           endDate: weekEnd.toISOString().split("T")[0],
//           label: formatWeekRangeLabel(weekStart, weekEnd),
//         },
//       }),
//     );

//     /* ---------- PAGINATION (in-memory on workers, safe for typical client sizes) ---------- */
//     const paginatedData = transformedData.slice(skip, skip + limit);

//     /* ---------- RESPONSE ---------- */
//     return sendSuccess(
//       res,
//       "Current week worker hours fetched successfully",
//       {
//         total: transformedData.length,
//         page,
//         limit,
//         totalPages: Math.ceil(transformedData.length / limit),
//         data: paginatedData,
//       },
//       200,
//       true,
//     );
//   },
// );

// exports.getAllHoursOfWorkerToClientController = catchAsync(
//   async (req, res, next) => {
//     const { tenantId, client_id } = req;

//     /* ---------- TENANT VALIDATION ---------- */
//     if (!tenantId) {
//       return next(new AppError("Tenant Id missing in headers", 400));
//     }

//     if (!isValidCustomUUID(tenantId)) {
//       return next(new AppError("Invalid Tenant-Id", 400));
//     }

//     /* ---------- PAGINATION ---------- */
//     const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
//     const limit =
//       Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;

//     const skip = (page - 1) * limit;

//     // -------filters ---------------
//     const query = {};
//     if (
//       req.body?.projectIds &&
//       !req.body?.workerIds &&
//       !req.body?.status &&
//       !req.body?.date
//     ) {
//       query.projecIds = req.body?.projecIds;
//     }
//     //  ----------- filters end ---------------

//     /* ---------- GET WORKERS OF THIS CLIENT ---------- */
//     const workerIds = await projectMode.distinct("project_workers.workers", {
//       tenantId,
//       "client_details.client": client_id,
//     });

//     if (!workerIds.length) {
//       return sendSuccess(
//         res,
//         "No workers found for this client",
//         {
//           total: 0,
//           page,
//           limit,
//           totalPages: 0,
//           data: [],
//         },
//         200,
//         true,
//       );
//     }

//     /* ---------- CURRENT + PREVIOUS 3 WEEKS ---------- */
//     const today = new Date();
//     const day = today.getDay() === 0 ? 7 : today.getDay();

//     const baseWeekStart = new Date(today);
//     baseWeekStart.setDate(today.getDate() - day + 1);
//     baseWeekStart.setHours(0, 0, 0, 0);

//     const weeks = [];

//     for (let i = 0; i <= 3; i++) {
//       const start = new Date(baseWeekStart);
//       start.setDate(baseWeekStart.getDate() - i * 7);
//       start.setHours(0, 0, 0, 0);

//       const end = new Date(start);
//       end.setDate(start.getDate() + 6);
//       end.setHours(23, 59, 59, 999);

//       weeks.push({ start, end });
//     }

//     /* ---------- FETCH HOURS DATA (ONLY CLIENT WORKERS) ---------- */
//     const hoursData = await hoursModel
//       .find({
//         tenantId,
//         workerId: { $in: workerIds },
//         "project.project_date": {
//           $gte: weeks[3].start,
//           $lte: weeks[0].end,
//         },
//       })
//       .populate([
//         {
//           path: "project.projectId",
//           select: "project_details.project_name",
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
//       .lean();

//     /* ---------- HELPERS ---------- */
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

//     const formatWeekRangeLabel = (startDate, endDate) => {
//       const options = { day: "numeric", month: "short" };
//       return `${new Date(startDate).toLocaleDateString(
//         "en-IN",
//         options,
//       )} - ${new Date(endDate).toLocaleDateString(
//         "en-IN",
//         options,
//       )} ${new Date(endDate).getFullYear()}`;
//     };

//     /* ---------- WEEK + WORKER GROUPING ---------- */
//     const transformedData = [];

//     weeks.forEach((week) => {
//       const workerMap = new Map();

//       hoursData.forEach((item) => {
//         const itemDate = new Date(item.project?.project_date);
//         if (!item.project?.project_date) return;

//         if (itemDate >= week.start && itemDate <= week.end) {
//           const workerKey = item.workerId?._id?.toString();
//           if (!workerKey) return;

//           if (!workerMap.has(workerKey)) {
//             workerMap.set(workerKey, {
//               latest: item,
//               total_hours_sum: Number(item.total_hours || 0),
//             });
//           } else {
//             const existing = workerMap.get(workerKey);

//             existing.total_hours_sum += Number(item.total_hours || 0);

//             if (
//               new Date(item.project.project_date) >
//               new Date(existing.latest.project.project_date)
//             ) {
//               existing.latest = item;
//             }
//           }
//         }
//       });

//       workerMap.forEach(({ latest, total_hours_sum }) => {
//         transformedData.push({
//           _id: latest._id,
//           tenantId: latest.tenantId,

//           worker: latest.workerId
//             ? {
//                 _id: latest.workerId._id,
//                 firstName:
//                   latest.workerId.worker_personal_details?.firstName || "",
//                 lastName:
//                   latest.workerId.worker_personal_details?.lastName || "",
//                 position: latest.workerId.worker_position?.[0]?.position || "",
//                 profile_picture:
//                   latest.workerId.personal_information?.documents
//                     ?.profile_picture,
//               }
//             : null,

//           project: latest.project?.projectId
//             ? {
//                 _id: latest.project.projectId._id,
//                 project_name:
//                   latest.project.projectId.project_details?.project_name || "",
//                 project_date: latest.project.project_date,
//               }
//             : null,

//           total_hours: formatHours(total_hours_sum),
//           status: latest.status,
//           createdAt: latest.createdAt,
//           updatedAt: latest.updatedAt,
//           break_time: latest.break_time,

//           weekRange: {
//             startDate: week.start.toLocaleDateString("en-IN"),
//             endDate: week.end.toLocaleDateString("en-IN"),
//             label: formatWeekRangeLabel(week.start, week.end),
//           },
//         });
//       });
//     });

//     /* ---------- PAGINATION ---------- */
//     const total = transformedData.length;
//     const totalPages = Math.ceil(total / limit);
//     const paginatedData = transformedData.slice(skip, skip + limit);

//     /* ---------- RESPONSE ---------- */
//     return sendSuccess(
//       res,
//       "Client week-wise worker hours fetched successfully",
//       {
//         total,
//         page,
//         limit,
//         totalPages,
//         data: paginatedData,
//       },
//       200,
//       true,
//     );
//   },
// );

// exports.getAllHoursOfWorkerToClientController = catchAsync(
//   async (req, res, next) => {
//     const { tenantId, client_id } = req;

//     /* ---------- TENANT VALIDATION ---------- */
//     if (!tenantId) {
//       return next(new AppError("Tenant Id missing in headers", 400));
//     }

//     if (!isValidCustomUUID(tenantId)) {
//       return next(new AppError("Invalid Tenant-Id", 400));
//     }

//     /* ---------- PAGINATION ---------- */
//     const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
//     const limit =
//       Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;

//     const skip = (page - 1) * limit;

//     /* ---------- PROJECT FILTER BUILD ---------- */
//     let projectFilter = {
//       tenantId,
//       "client_details.client": client_id,
//     };

//     // ✅ Filter by projectIds (if provided)
//     if (req.body?.projectIds?.length) {
//       projectFilter._id = {
//         $in: req.body.projectIds.map((id) => new mongoose.Types.ObjectId(id)),
//       };
//     }

//     /* ---------- GET WORKERS FROM FILTERED PROJECTS ---------- */
//     const workerIds = await projectMode.distinct(
//       "project_workers.workers",
//       projectFilter,
//     );

//     if (!workerIds.length) {
//       return sendSuccess(
//         res,
//         "No workers found",
//         {
//           total: 0,
//           page,
//           limit,
//           totalPages: 0,
//           data: [],
//         },
//         200,
//         true,
//       );
//     }

//     /* ---------- CURRENT + PREVIOUS 3 WEEKS ---------- */
//     const today = new Date();
//     const day = today.getDay() === 0 ? 7 : today.getDay();

//     const baseWeekStart = new Date(today);
//     baseWeekStart.setDate(today.getDate() - day + 1);
//     baseWeekStart.setHours(0, 0, 0, 0);

//     const weeks = [];

//     for (let i = 0; i <= 3; i++) {
//       const start = new Date(baseWeekStart);
//       start.setDate(baseWeekStart.getDate() - i * 7);
//       start.setHours(0, 0, 0, 0);

//       const end = new Date(start);
//       end.setDate(start.getDate() + 6);
//       end.setHours(23, 59, 59, 999);

//       weeks.push({ start, end });
//     }

//     /* ---------- HOURS FILTER ---------- */
//     let hoursFilter = {
//       tenantId,
//       workerId: { $in: workerIds },
//       "project.project_date": {
//         $gte: weeks[3].start,
//         $lte: weeks[0].end,
//       },
//     };

//     // ✅ Filter by projectIds again at hours level
//     if (req.body?.projectIds?.length) {
//       hoursFilter["project.projectId"] = {
//         $in: req.body.projectIds.map((id) => new mongoose.Types.ObjectId(id)),
//       };
//     }

//     // ✅ 🔥 STATUS FILTER ADDED
//     if (req.body?.status) {
//       const allowedStatus = ["pending", "approved", "review"];

//       if (!allowedStatus.includes(req.body.status)) {
//         return next(new AppError("Invalid status value", 400));
//       }

//       hoursFilter.status = req.body.status;
//     }

//     /* ---------- FETCH HOURS DATA ---------- */
//     const hoursData = await hoursModel
//       .find(hoursFilter)
//       .populate([
//         {
//           path: "project.projectId",
//           select: "project_details.project_name",
//         },
//         {
//           path: "workerId",
//           select:
//             "worker_personal_details.firstName worker_personal_details.lastName worker_position personal_information.documents.profile_picture createdAt",
//           populate: {
//             path: "worker_position",
//             select: "position",
//           },
//         },
//       ])
//       .lean();

//     /* ---------- HELPERS ---------- */
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

//     const formatWeekRangeLabel = (startDate, endDate) => {
//       const options = { day: "numeric", month: "short" };
//       return `${new Date(startDate).toLocaleDateString(
//         "en-IN",
//         options,
//       )} - ${new Date(endDate).toLocaleDateString(
//         "en-IN",
//         options,
//       )} ${new Date(endDate).getFullYear()}`;
//     };

//     /* ---------- WEEK + WORKER GROUPING ---------- */
//     const transformedData = [];

//     weeks.forEach((week) => {
//       const workerMap = new Map();

//       hoursData.forEach((item) => {
//         if (!item.project?.project_date) return;

//         const itemDate = new Date(item.project.project_date);

//         if (itemDate >= week.start && itemDate <= week.end) {
//           const workerKey = item.workerId?._id?.toString();
//           if (!workerKey) return;

//           if (!workerMap.has(workerKey)) {
//             workerMap.set(workerKey, {
//               latest: item,
//               total_hours_sum: Number(item.total_hours || 0),
//             });
//           } else {
//             const existing = workerMap.get(workerKey);
//             existing.total_hours_sum += Number(item.total_hours || 0);

//             if (
//               new Date(item.project.project_date) >
//               new Date(existing.latest.project.project_date)
//             ) {
//               existing.latest = item;
//             }
//           }
//         }
//       });

//       workerMap.forEach(({ latest, total_hours_sum }) => {
//         transformedData.push({
//           _id: latest._id,
//           tenantId: latest.tenantId,
//           weekNumber: getWeeksSinceCreated(
//             latest.workerId.createdAt,
//             week.start,
//           ),
//           worker: latest.workerId
//             ? {
//                 _id: latest.workerId._id,
//                 firstName:
//                   latest.workerId.worker_personal_details?.firstName || "",
//                 lastName:
//                   latest.workerId.worker_personal_details?.lastName || "",
//                 position: latest.workerId.worker_position?.[0]?.position || "",
//                 profile_picture:
//                   latest.workerId.personal_information?.documents
//                     ?.profile_picture || "",
//               }
//             : null,

//           project: latest.project?.projectId
//             ? {
//                 _id: latest.project.projectId._id,
//                 project_name:
//                   latest.project.projectId.project_details?.project_name || "",
//                 project_date: latest.project.project_date,
//               }
//             : null,

//           total_hours: formatHours(total_hours_sum),
//           status: latest.status,
//           createdAt: latest.createdAt,
//           updatedAt: latest.updatedAt,

//           weekRange: {
//             startDate: week.start.toLocaleDateString("en-IN"),
//             endDate: week.end.toLocaleDateString("en-IN"),
//             label: formatWeekRangeLabel(week.start, week.end),
//           },
//         });
//       });
//     });

//     /* ---------- PAGINATION ---------- */
//     const total = transformedData.length;
//     const totalPages = Math.ceil(total / limit);
//     const paginatedData = transformedData.slice(skip, skip + limit);

//     /* ---------- RESPONSE ---------- */
//     return sendSuccess(
//       res,
//       "Client week-wise worker hours fetched successfully",
//       {
//         total,
//         page,
//         limit,
//         totalPages,
//         data: paginatedData,
//       },
//       200,
//       true,
//     );
//   },
// );

exports.getAllHoursOfWorkerToClientController = catchAsync(
  async (req, res, next) => {
    const { tenantId, client_id } = req;

    /* ---------- TENANT VALIDATION ---------- */
    if (!tenantId)
      return next(new AppError("Tenant Id missing in headers", 400));

    if (!isValidCustomUUID(tenantId))
      return next(new AppError("Invalid Tenant-Id", 400));

    /* ---------- PAGINATION ---------- */
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit =
      Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;

    const skip = (page - 1) * limit;

    /* ---------- PROJECT FILTER ---------- */
    let projectFilter = {
      tenantId,
      "client_details.client": client_id,
    };

    if (req.body?.projectIds?.length) {
      projectFilter._id = {
        $in: req.body.projectIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    const workerIds = await projectMode.distinct(
      "project_workers.workers",
      projectFilter,
    );

    if (!workerIds.length) {
      return sendSuccess(
        res,
        "No workers found",
        { total: 0, page, limit, totalPages: 0, data: [] },
        200,
        true,
      );
    }

    /* ========================================================= */
    /* ================== WEEK CALCULATION ===================== */
    /* ========================================================= */

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

    /* ========================================================= */
    /* ===================== HOURS FILTER ====================== */
    /* ========================================================= */

    let hoursFilter = {
      tenantId,
      workerId: { $in: workerIds },
    };

    let activeWeeks = weeks;

    // Default → last 4 weeks
    hoursFilter["project.project_date"] = {
      $gte: weeks[3].start,
      $lte: weeks[0].end,
    };

    // ✅ Custom Date Override
    if (req.body?.date?.length === 2) {
      const startDate = new Date(req.body.date[0]);
      const endDate = new Date(req.body.date[1]);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        hoursFilter["project.project_date"] = {
          $gte: startDate,
          $lte: endDate,
        };

        activeWeeks = [
          {
            start: startDate,
            end: endDate,
          },
        ];
      }
    }

    // Project filter again at hours level
    if (req.body?.projectIds?.length) {
      hoursFilter["project.projectId"] = {
        $in: req.body.projectIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // Status filter
    if (req.body?.status) {
      const allowedStatus = ["pending", "approved", "review"];

      if (!allowedStatus.includes(req.body.status)) {
        return next(new AppError("Invalid status value", 400));
      }

      hoursFilter.status = req.body.status;
    }

    /* ========================================================= */
    /* ===================== FETCH DATA ======================== */
    /* ========================================================= */

    const hoursData = await hoursModel
      .find(hoursFilter)
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

    /* ========================================================= */
    /* ======================= HELPERS ========================= */
    /* ========================================================= */

    const formatHours = (decimalHours = 0, break_time = 0) => {
      // convert to total minutes
      const totalMinutes =
        Math.round(decimalHours * 60) - Math.round(break_time);

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      const decimal = (totalMinutes / 60).toFixed(2);

      return {
        decimal,
        hours,
        minutes,
        label: `${decimalHours} h (${hours}h ${minutes}min)`,
      };
    };
    const formatWeekRangeLabel = (start, end) => {
      return `${start.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })} - ${end.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })} ${end.getFullYear()}`;
    };

    /* ========================================================= */
    /* ======================= GROUPING ======================== */
    /* ========================================================= */

    const transformedData = [];

    activeWeeks.forEach((week) => {
      const workerMap = new Map();

      hoursData.forEach((item) => {
        if (!item.project?.project_date) return;

        const itemDate = new Date(item.project.project_date);

        if (itemDate >= week.start && itemDate <= week.end) {
          const workerKey = item.workerId?._id?.toString();
          if (!workerKey) return;

          if (!workerMap.has(workerKey)) {
            workerMap.set(workerKey, {
              latest: item,
              total_hours_sum: Number(item.total_hours || 0),
              breakTime: Number(item.break_time || 0),
            });
          } else {
            const existing = workerMap.get(workerKey);
            existing.total_hours_sum += Number(item.total_hours || 0);
            existing.breakTime += Number(item.break_time);
            if (
              new Date(item.project.project_date) >
              new Date(existing.latest.project.project_date)
            ) {
              existing.latest = item;
            }
          }
        }
      });

      workerMap.forEach(({ latest, total_hours_sum, breakTime }) => {
        transformedData.push({
          _id: latest._id,
          tenantId: latest.tenantId,

          weekNumber: getWeekNumberFromWeekStart(week.start),

          worker: {
            _id: latest.workerId._id,
            firstName: latest.workerId.worker_personal_details?.firstName || "",
            lastName: latest.workerId.worker_personal_details?.lastName || "",
            position: latest.workerId.worker_position?.[0]?.position || "",
            profile_picture:
              latest.workerId.personal_information?.documents
                ?.profile_picture || "",
          },

          project: latest.project?.projectId
            ? {
                _id: latest.project.projectId._id,
                project_name:
                  latest.project.projectId.project_details?.project_name || "",
                project_date: latest?.project?.project_date,
              }
            : null,

          total_hours: formatHours(total_hours_sum, breakTime),
          status: latest.status,
          createdAt: latest.createdAt,
          updatedAt: latest.updatedAt,
          break_time: breakTime,
          weekRange: {
            startDate: week.start.toLocaleDateString("en-IN"),
            endDate: week.end.toLocaleDateString("en-IN"),
            label: formatWeekRangeLabel(week.start, week.end),
          },
        });
      });
    });

    /* ========================================================= */
    /* ======================= PAGINATION ====================== */
    /* ========================================================= */

    const total = transformedData.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedData = transformedData.slice(skip, skip + limit);

    return sendSuccess(
      res,
      "Client week-wise worker hours fetched successfully",
      { total, page, limit, totalPages, data: paginatedData },
      200,
      true,
    );
  },
);

// single worker weeks hours llsit for client
// exports.getSingleWorkerWeeklyHoursToClientController = catchAsync(
//   async (req, res, next) => {
//     const { tenantId, client_id } = req;
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
//     const client_project = await projectMode
//       .find({ tenantId, "client_details.client": client_id })
//       .select("project_workers.workers");
//     const workerIds = [];
//     client_project.forEach((val) =>
//       workerIds.push(...val?.project_workers.workers),
//     );
//     /* ---------- FETCH DATA ---------- */
//     const hoursData = await hoursModel
//       .find({
//         tenantId,
//         workerId: { $in: workerIds },
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
//       .sort({ createdAt: 1 })
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
//         image: obj.image,
//         createdBy: obj?.createdBy || "",
//         total_hours: formatHours(obj.total_hours),

//         // ✅ LATE INFO
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

// exports.getSingleWorkerWeeklyHoursToClientController = catchAsync(
//   async (req, res, next) => {
//     const { tenantId, client_id } = req;
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

//     /* ---------- GET CLIENT PROJECTS WHERE WORKER EXISTS ---------- */
//     const clientProjects = await projectMode
//       .find({
//         tenantId,
//         "client_details.client": client_id,
//         "project_workers.workers": workerId,
//       })
//       .select("_id")
//       .lean();

//     if (!clientProjects.length) {
//       return next(new AppError("Worker is not assigned to this client", 400));
//     }

//     const projectIds = clientProjects.map((p) => p._id);

//     /* ---------- FETCH HOURS DATA ---------- */
//     const hoursData = await hoursModel
//       .find({
//         tenantId,
//         workerId,
//         "project.projectId": { $in: projectIds },
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
//       .sort({ createdAt: 1 })
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
//         graceMinutes: 0,
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

//         /* LATE INFO */
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

exports.getSingleWorkerWeeklyHoursToClientController = catchAsync(
  async (req, res, next) => {
    const { tenantId, client_id } = req;
    const { workerId, startDate, endDate } = req.body;
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

    /* ---------- WEEK CALCULATION (MON–SUN) ---------- */
    const dayNumber = baseDate.getDay() === 0 ? 7 : baseDate.getDay();

    const weekStart = new Date(baseDate);
    weekStart.setDate(baseDate.getDate() - dayNumber + 1 - weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    /* ---------- GET CLIENT PROJECT IDS (SECURITY CHECK) ---------- */
    const clientProjects = await projectMode
      .find({
        tenantId,
        "client_details.client": client_id,
        "project_workers.workers": workerId,
      })
      .select("_id")
      .lean();

    if (!clientProjects.length) {
      return next(new AppError("Worker is not assigned to this client", 400));
    }

    const projectIds = clientProjects.map(
      (p) => new mongoose.Types.ObjectId(p._id),
    );

    /* ---------- AGGREGATION ---------- */
    const hoursData = await hoursModel.aggregate([
      {
        $match: {
          tenantId,
          workerId: new mongoose.Types.ObjectId(workerId),
          "project.projectId": { $in: projectIds },
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
        $unwind: { path: "$projectDetails", preserveNullAndEmptyArrays: true },
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
                worker_position: 1,
                "personal_information.documents.profile_picture": 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$worker", preserveNullAndEmptyArrays: true } },

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
    ]);

    /* ---------- HOURS FORMATTER ---------- */
    const formatHours = (decimalHours = 0, break_time = 0) => {
      // convert to total minutes
      const totalMinutes =
        Math.round(decimalHours * 60) - Math.round(break_time);

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      const decimal = (totalMinutes / 60).toFixed(2);

      return {
        decimal,
        hours,
        minutes,
        label: `${decimalHours} h (${hours}h ${minutes}min)`,
      };
    };

    const formatDateDDMMYYYY = (date) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    /* ---------- TRANSFORM DATA ---------- */
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
        weekNumber: getWeekNumberFromWeekStart(weekStart),
        status: obj.status,
        comments: obj.comments,
        image: obj.images,
        createdBy: obj.createdBy || "",
        total_hours: formatHours(obj.total_hours),

        weekRange: {
          startDate: formatDateDDMMYYYY(weekStart),
          endDate: formatDateDDMMYYYY(weekEnd),
        },

        is_late: lateResult.isLate,
        late_time: lateResult.lateTime,
        late_minutes: lateResult.lateMinutes,
      };
    });

    return sendSuccess(
      res,
      "Client worker weekly hours fetched successfully",
      finalData,
      200,
      true,
    );
  },
);
