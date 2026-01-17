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
const axios = require("axios");
const { isValidCustomUUID } = require("custom-uuid-generator");

exports.createWorkerHours = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { file } = req;

  const {
    project,
    day_off,
    start_working_hours,
    finish_hours,
    break_time,
    comments,
    workerId,
  } = req.body;
  /* ---------- SAFE JSON PARSE ---------- */
  const safeParse = (value) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (err) {
        return next(new AppError("Invalid JSON format", 400));
      }
    }
    return value;
  };

  const parsedProject = safeParse(project);
  const parsedStartHours = safeParse(start_working_hours);
  const parsedFinishHours = safeParse(finish_hours);

  /* ---------- VALIDATION ---------- */
  if (!workerId || !mongoose.isValidObjectId(workerId)) {
    return next(new AppError("Invalid workerId", 400));
  }

  if (!parsedProject?.projectId) {
    return next(new AppError("Project ID missing", 400));
  }

  if (!comments) {
    return next(new AppError("Comments required", 400));
  }

  /* ---------- GET PROJECT DATE ---------- */
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
    break_time,
    comments,
    workerId,
    createdBy: req.role,
  };

  // ✅ IMAGE OPTIONAL
  if (file?.path) {
    payload.image = file.path;
  }

  /* ---------- CREATE RECORD ---------- */
  const newRecord = await hoursModel.create(payload);

  return sendSuccess(res, "Hours added successfully", newRecord, 200, true);
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
exports.getAllHoursOfWorkerController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  /* ---------- TENANT VALIDATION ---------- */
  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

  /* ---------- PAGINATION (CLIENT STYLE) ---------- */
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit =
    Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;

  const skip = (page - 1) * limit;

  /* ---------- CURRENT WEEK (MON–SUN) ---------- */
  const today = new Date();
  const day = today.getDay() === 0 ? 7 : today.getDay();

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - day + 1);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  /* ---------- FETCH DATA ---------- */
  const hoursData = await hoursModel
    .find({ tenantId })
    .populate([
      {
        path: "project.projectId",
        select: "project_details.project_name",
      },
      {
        path: "workerId",
        select:
          "worker_personal_details.firstName worker_personal_details.lastName worker_position",
        populate: {
          path: "worker_position",
          select: "position",
        },
      },
    ])
    .sort({ createdAt: -1 })
    .lean();

  /* ---------- UNIQUE WORKER (LATEST ENTRY) ---------- */
  const workerMap = new Map();
  for (const item of hoursData) {
    const key = item.workerId?._id
      ? item.workerId?._id?.toString()
      : item.workerId?.toString();

    if (!workerMap.has(key)) {
      workerMap.set(key, item);
    }
  }

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

  /* ---------- WEEK RANGE LABEL ---------- */
  const formatWeekRangeLabel = (startDate, endDate) => {
    const options = { day: "numeric", month: "short" };
    const start = new Date(startDate);
    const end = new Date(endDate);

    return `${start.toLocaleDateString(
      "en-IN",
      options,
    )} - ${end.toLocaleDateString("en-IN", options)} ${end.getFullYear()}`;
  };

  /* ---------- TRANSFORM DATA (WEEK-BASED FINAL LIST) ---------- */
  const transformedData = Array.from(workerMap.values()).map((obj) => ({
    _id: obj._id,
    tenantId: obj.tenantId,

    worker: obj.workerId
      ? {
          _id: obj.workerId._id,
          firstName: obj.workerId.worker_personal_details?.firstName || "",
          lastName: obj.workerId.worker_personal_details?.lastName || "",
          position: obj.workerId.worker_position?.[0]?.position || "",
        }
      : null,

    project: obj.project?.projectId
      ? {
          _id: obj.project.projectId._id,
          project_name:
            obj.project.projectId.project_details?.project_name || "",
          project_date: obj.project.project_date,
        }
      : null,

    weekNumber: obj.weekNumber,
    status: obj.status,
    start_working_hours: obj.start_working_hours,
    finish_hours: obj.finish_hours,
    break_time: obj.break_time,
    comments: obj.comments,
    image: obj.image,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    createdBy: obj?.createdBy || "",
    total_hours: formatHours(obj.total_hours),

    weekRange: {
      startDate: weekStart.toISOString().split("T")[0],
      endDate: weekEnd.toISOString().split("T")[0],
      label: formatWeekRangeLabel(weekStart, weekEnd),
    },
  }));

  /* ---------- APPLY PAGINATION AFTER LOGIC ---------- */
  const paginatedData = transformedData.slice(skip, skip + limit);

  /* ---------- RESPONSE (TOTAL = WEEK-BASED TOTAL) ---------- */
  return sendSuccess(
    res,
    "Worker hours fetched successfully",
    {
      total: transformedData.length, // ✅ FIXED: week-based total
      page,
      limit,
      totalPages: Math.ceil(transformedData.length / limit),
      data: paginatedData,
    },
    200,
    true,
  );
});

//  get single worker hours for weekly
exports.getSingleWorkerWeeklyHoursController = catchAsync(
  async (req, res, next) => {
    const { tenantId } = req;
    const { workerId } = req.query;
    const weekOffset = Number(req.query.weekOffset) || 0;

    /* ---------- VALIDATION ---------- */
    if (!tenantId) {
      return next(new AppError("Tenant Id missing in headers", 400));
    }

    if (!isValidCustomUUID(tenantId)) {
      return next(new AppError("Invalid Tenant-Id", 400));
    }

    if (!workerId) {
      return next(new AppError("Worker Id missing", 400));
    }

    /* ---------- WEEK CALCULATION (MON–SUN) ---------- */
    const today = new Date();
    const day = today.getDay() === 0 ? 7 : today.getDay();

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - day + 1 + weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    /* ---------- FETCH DATA ---------- */
    const hoursData = await hoursModel
      .find({
        tenantId,
        workerId,
        createdAt: { $gte: weekStart, $lte: weekEnd },
      })
      .populate([
        {
          path: "project.projectId",
          select:
            "project_details.prject_name project_details.project_location_address",
        },
        {
          path: "workerId",
          select:
            "worker_personal_details.firstName worker_personal_details.lastName worker_position",
          populate: {
            path: "worker_position",
            select: "position",
          },
        },
      ])
      .sort({ createdAt: 1 })
      .lean();
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
    /* ---------- WEEK RANGE LABEL ---------- */
    const formatWeekRangeLabel = (startDate, endDate) => {
      const options = { day: "numeric", month: "short" };
      const start = new Date(startDate);
      const end = new Date(endDate);

      return `${start.toLocaleDateString(
        "en-IN",
        options,
      )} - ${end.toLocaleDateString("en-IN", options)} ${end.getFullYear()}`;
    };

    /* ---------- TRANSFORM DATA (WORKER INSIDE EACH ROW) ---------- */

    const finalData = hoursData.map((obj) => ({
      _id: obj._id,
      date: obj.createdAt,

      worker: obj.workerId
        ? {
            _id: obj.workerId._id,
            firstName: obj.workerId.worker_personal_details?.firstName || "",
            lastName: obj.workerId.worker_personal_details?.lastName || "",
            position: obj.workerId.worker_position?.[0]?.position || "",
          }
        : null,

      project: obj.project?.projectId
        ? {
            _id: obj.project.projectId._id,
            project_name:
              obj.project.projectId.project_details?.project_name || "",
            project_date: obj.project.project_date || "",
            address:
              obj.project.projectId.project_details?.project_location_address ||
              "",
          }
        : null,

      start_working_hours: obj.start_working_hours,
      finish_hours: obj.finish_hours,
      break_time: obj.break_time,
      day_off: obj.day_off,
      weekNumber: obj.weekNumber,
      status: obj.status,
      comments: obj.comments,
      image: obj.image,
      createdBy: obj?.createdBy || "",
      total_hours: formatHours(obj.total_hours),
    }));

    /* ---------- RESPONSE ---------- */
    return sendSuccess(
      res,
      "Worker weekly hours fetched successfully",
      finalData,
      200,
      true,
    );
  },
);

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
  const { h_id, status } = req.query;

  if (!h_id || !mongoose.isValidObjectId(h_id))
    return next(new AppError("Invalid hours id", 400));

  if (!status) return next(new AppError("Status required", 400));

  const result = await hoursModel.findByIdAndUpdate(
    h_id,
    { status },
    { new: true },
  );

  if (!result) return next(new AppError("Record not found", 404));

  return sendSuccess(res, "hours updated successfully", result, 200, true);
});

// <------- dahsboard hours --------->

exports.dashboardHours = catchAsync(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  /* ---------- 1️⃣ Pending Hours ---------- */
  const pendingResult = await hoursModel.aggregate([
    { $match: { status: "pending" } },
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ["$total_hours", 0] } },
      },
    },
  ]);

  /* ---------- 2️⃣ Total Hours (Current Month) ---------- */
  const monthHoursResult = await hoursModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth, $lt: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ["$total_hours", 0] } },
      },
    },
  ]);

  /* ---------- 3️⃣ ACTIVE PROJECTS (FIXED) ---------- */

  // ⛔ DON'T include extra fields here
  const projectIds = await hoursModel.distinct("project", {
    createdAt: { $gte: startOfMonth, $lt: endOfMonth },
  });

  // ✅ projectIds = [ObjectId, ObjectId, ObjectId]
  const activeProjectsThisMonth = await projectMode.countDocuments({
    _id: { $in: projectIds },
    tenantId: req.tenantId,
    status: "active",
  });

  res.status(200).json({
    success: true,
    pendingHours: pendingResult[0]?.total || 0,
    totalHoursThisMonth: monthHoursResult[0]?.total || 0,
    activeProjectsThisMonth,
  });
});

// <------ dashboard hours end ---------->

exports.generateTimesheetPDF = async (req, res) => {
  try {
    const { project, worker, date, status } = req.query;

    // 1️⃣ Fetch data (same API you already have)
    const response = await axios.get(
      "http://localhost:8002/api/v1/client/get-weekly-report",
      {
        params: { project, worker, date, status },
      },
    );

    if (!response.data.status) {
      return res.status(400).json({ message: "No data found" });
    }

    const data = response.data.data;

    // 2️⃣ HTML TEMPLATE (converted from your HTML)
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  body { font-family: Arial, sans-serif; }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 15mm;
    border: 1px solid #000;
    box-sizing: border-box;
  }
  h2 { text-align: center; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-top: 10px;
  }
  th, td {
    border: 1px solid #000;
    padding: 6px;
    text-align: center;
  }
  .row { display: flex; margin-bottom: 8px; }
  .box { flex: 1; border: 1px solid #000; padding: 6px; }
</style>
</head>

<body>
<div class="page">
  <h2>Weekly Time Sheet</h2>

  <div class="row">
    <div>Client: ${data.client.client_details.client_name}</div>
  </div>

  <div class="row">
    <div class="box">First Name: ${
      data.worker.worker_personal_details.firstName
    }</div>
    <div class="box">Last Name: ${
      data.worker.worker_personal_details.lastName
    }</div>
    <div class="box">Week: ${data.hours[0]?.weekNumber || "-"}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Task</th>
        <th>Job</th>
        <th>Start</th>
        <th>End</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${data.hours
        .map(
          (h) => `
        <tr>
          <td>${new Date(h.createdAt).toLocaleDateString()}</td>
          <td>${h.comments || "-"}</td>
          <td>${data.worker.worker_position}</td>
          <td>${h.start_working_hours.hours}:${
            h.start_working_hours.minutes
          }</td>
          <td>${h.finish_hours.hours}:${h.finish_hours.minutes}</td>
          <td>${h.total_hours}</td>
        </tr>`,
        )
        .join("")}
    </tbody>
  </table>

</div>
</body>
</html>
`;

    // 3️⃣ Puppeteer PDF generation
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm",
      },
    });

    await browser.close();

    // 4️⃣ Send PDF response
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Timesheet-${data.project.projectId}.pdf`,
    });

    return res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "PDF generation failed" });
  }
};

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
