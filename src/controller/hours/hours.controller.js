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

exports.createWorkerHours = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { file } = req;
  // if (!file || file.length === 0 || file === undefined) {
  //   return next(new AppError("Image Required", 400));
  // }
  const {
    project,
    day_off,
    start_working_hours,
    finish_hours,
    break_time,
    comments,
    workerId,
  } = req.body;

  const payload = {
    tenantId,
    project: JSON.parse(project),
    start_working_hours: JSON.parse(start_working_hours),
    finish_hours: JSON.parse(finish_hours),
    day_off,
    break_time,
    comments,
    workerId,
    image: file.path,
  };

  if (!workerId || !mongoose.isValidObjectId(workerId))
    return next(new AppError("Invalid workerId", 400));

  if (!payload.project?.projectId)
    return next(new AppError("Project ID missing", 400));

  // 🔥 AUTO GET PROJECT DATE
  const projectData = await projectMode
    .findById(payload.project.projectId)
    .lean();
  if (!projectData) return next(new AppError("Project not found", 404));

  const projectDate = projectData.project_details?.project_start_date;
  if (!projectDate)
    return next(new AppError("Project start date missing", 400));

  if (!payload.start_working_hours?.hours || !payload.finish_hours?.hours)
    return next(new AppError("Working hours missing", 400));

  if (!comments || !payload.image)
    return next(new AppError("Comments & image required", 400));

  const newRecord = await hoursModel.create(payload);

  return sendSuccess(res, "Hours added successfully", newRecord, 200, true);
});

exports.updateWorkerHours = catchAsync(async (req, res, next) => {
  const { h_id } = req.query;

  if (!h_id || !mongoose.isValidObjectId(h_id))
    return next(new AppError("Invalid ID", 400));

  const updated = await hoursModel.findOneAndUpdate({ _id: h_id }, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updated) return next(new AppError("Record not found", 404));

  return sendSuccess(res, "Hours updated successfully", updated, 200, true);
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
    { status: "approved" }
  );

  return sendSuccess(
    res,
    `${result.modifiedCount} entries approved`,
    {},
    200,
    true
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

// approve hours
exports.approveHours = catchAsync(async (req, res, next) => {
  const { h_id, status } = req.query;

  if (!h_id || !mongoose.isValidObjectId(h_id))
    return next(new AppError("Invalid hours id", 400));

  if (!status) return next(new AppError("Status required", 400));

  const result = await hoursModel.findByIdAndUpdate(
    h_id,
    { status },
    { new: true }
  );

  if (!result) return next(new AppError("Record not found", 404));

  return sendSuccess(res, "hours updated successfully", result, 200, true);
});

// <------- dahsboard hours --------->

exports.dashboardHours = catchAsync(async (req, res, next) => {
  const hours = await hoursModel.find({});

  // 1️⃣ Pending Hours
  const pendingHours = hours.reduce((acc, crr) => {
    if (crr.status === "pending") {
      return acc + Number(crr.total_hours || 0);
    }
    return acc;
  }, 0);

  // 2️⃣ Current Month Range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // 3️⃣ Filter only this month's records
  const currentMonthRecords = hours.filter((h) => {
    return h.createdAt >= startOfMonth && h.createdAt < endOfMonth;
  });

  // 4️⃣ Total hours for current month
  const totalHoursThisMonth = currentMonthRecords.reduce((acc, h) => {
    return acc + Number(h.total_hours || 0);
  }, 0);

  console.log("Pending Hours:", pendingHours);
  console.log("Current Month Total Hours:", totalHoursThisMonth);

  res.status(200).json({
    success: true,
    pendingHours,
    totalHoursThisMonth,
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
      }
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
        </tr>`
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
