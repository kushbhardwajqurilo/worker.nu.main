const { default: mongoose } = require("mongoose");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");
const fs = require("fs");
const { isValidCustomUUID } = require("custom-uuid-generator");
const clientModel = require("../../models/clientModel");
const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");
const { cloudinary } = require("../../confing/cloudinaryConfig");
const projectMode = require("../../models/projectMode");
const { workerModel } = require("../../models/workerModel");
const hoursModel = require("../../models/hoursModel");

// add client start here
exports.addClient = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId) {
    return next(new AppError("Tenant Missing The Request", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant", 400));
  }
  if (!req.body || req.body.toString().trim().length === 0) {
    return next(new AppError("Client data missing", 400));
  }
  const validate = [
    "client_type",
    "client_name",
    "client_email",
    "client_location_address",
    "city",
    "post_code",
  ];
  for (let feilds of validate) {
    if (
      !req.body.client_details[feilds] ||
      req.body.client_details[feilds].toString().trim().length === 0
    ) {
      return next(new AppError(`${feilds} is Required`, 400));
    }
  }
  const payload = {
    tenantId: tenantId,
    ...req.body,
  };
  const client = await clientModel.create(payload);
  if (!client) {
    return next(new AppError("failed to add client", 400));
  }

  const urlToken = await jwt.sign(
    { client_id: client._id, role: "client", tenantId },
    process.env.CLIENT_KEY,
  );

  client.client_url = `http://localhost:3000/client?tkn=${urlToken}`;
  await client.save();
  sendSuccess(res, "Client add successfully", {}, 200, true);
});

// add client end here

// get all client list
exports.getAllClientController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  const query = {
    tenantId,
    isDelete: false,
  };
  if (req.query.filter) {
    if (!mongoose.Types.ObjectId.isValid(req.query.filter)) {
      return next(new AppError("Invalid client"));
    }
    query._id = req.query.filter;
  }
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit =
    Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;

  const skip = (page - 1) * limit;

  const totalClients = await clientModel.countDocuments(query);

  const clientList = await clientModel
    .find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(
    res,
    "Client list fetched successfully",
    {
      total: totalClients,
      page,
      limit,
      totalPages: Math.ceil(totalClients / limit),
      clients: clientList,
    },
    200,
    true,
  );
});

// get all client for admin end

// get single client details for admin

exports.getSingleClientController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  const { client } = req.query;
  if (!client) {
    return next(new AppError("Client Credential Missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(client)) {
    return next(new AppError("Invalid Client ObjectId", 400));
  }
  const isClient = await clientModel.findOne({ tenantId, _id: client });
  if (!isClient) {
    return next(new AppError("Client not found", 400));
  }
  return sendSuccess(res, "client found", isClient, 201, true);
});

// get single client details end

// update client only by admin

exports.updateClientController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

  const { client } = req.query;

  if (!client) {
    return next(new AppError("Client credentials missing", 400));
  }

  // 🔹 Check existing client
  const isClient = await clientModel.findById(client);
  if (!isClient) {
    return next(new AppError("Client not found", 400));
  }

  // 🔹 Duplicate check only if values exist
  const orConditions = [];

  if (req.body?.client_details?.client_email) {
    orConditions.push({
      "client_details.client_email": req.body.client_details.client_email,
    });
  }

  if (req.body?.contact_details?.phone) {
    orConditions.push({
      "contact_details.phone": req.body.contact_details.phone,
    });
  }

  if (orConditions.length) {
    const duplicates = await clientModel.findOne({
      tenantId,
      _id: { $ne: client },
      $or: orConditions,
    });

    if (duplicates) {
      return next(new AppError("Email or phone already in use", 400));
    }
  }

  // 🔹 Remove blank fields before update
  const cleanObject = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (obj[key] === "" || obj[key] === null || obj[key] === undefined) {
        delete obj[key];
      } else if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
        cleanObject(obj[key]);
        if (Object.keys(obj[key]).length === 0) delete obj[key];
      }
    });
    return obj;
  };

  const cleanBody = cleanObject({ ...req.body });

  if (!Object.keys(cleanBody).length) {
    return next(new AppError("Nothing to update", 400));
  }

  // 🔹 Update client
  const updateResult = await clientModel.updateOne(
    { _id: client },
    { $set: cleanBody },
  );

  if (updateResult.modifiedCount === 0) {
    return next(new AppError("Update failed, try again", 400));
  }

  return sendSuccess(res, "Update success", {}, 200, true);
});

//  update client only by admin end

// delete client start

exports.deleteClientController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  const { admin_id } = req;
  const { client } = req.query;
  if (!admin_id || admin_id.toString().trim().length === 0) {
    return next(new AppError("Invalid Admin Credentials", 400));
  }
  if (!client || client.toString().trim().length === 0) {
    return next(new AppError("client credentials requried", 400));
  }
  const isClient = await clientModel.findOne({ tenantId, _id: client });
  if (!isClient) {
    return next(new AppError("client not found", 400));
  }
  isClient.isDelete = true;
  await isClient.save();
  return sendSuccess(res, "client deleted", {}, 201, true);
});

// delete client end

// <----------- delete multiple client ----------->

exports.deleteMultipleClients = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  const { c_id } = req.body;
  if (!c_id || c_id.length === 0) {
    return next(new ("client credentials requried", 400)());
  }
  for (let id of c_id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid Client Information", 400));
    }
  }
  const result = await clientModel.updateMany(
    { tenantId, _id: { $in: c_id } },
    { $set: { isDelete: true } },
  );
  if (!result || result.length === 0) {
    return next(new AppError("Failed to delete clients", 400));
  }
  return sendSuccess(res, "client deleted", {}, 201, true);
});

// <----------- delete multiple client end ----------->

// <------- search client ----------->

exports.searchClientController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  const { q } = req.query;
  const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = {
    $or: [
      {
        "client_details.client_email": {
          $regex: `^${safeQuery}`,
          $options: "i",
        },
      },
      {
        "client_details.client_name": {
          $regex: `^${safeQuery}`,
          $options: "i",
        },
      },
      {
        "client_details.client_phone": {
          $regex: `^${safeQuery}`,
          $options: "i",
        },
      },
      {
        "contact_details.phone": {
          $regex: `^{safeQuery}`,
          $options: "i",
        },
      },
    ],
  };
  const result = await clientModel.find({ tenantId, query });
  if (!result || result.length) {
    return next(new AppError("no client found"));
  }
  return sendSuccess(res, "", result, 200, true);
});

// <------- search client end ---------->

// <------- client signature upload --------->

exports.clientSignature = catchAsync(async (req, res, next) => {
  const clientId = req.client_id;
  const { file } = req;

  if (!clientId) {
    return next(new AppError("Client ID is required", 400));
  }

  // Upload base64 signature to Cloudinary
  const uploadRes = await cloudinary.uploader.upload(file.path, {
    folder: "client_signatures",
  });
  if (!uploadRes || !uploadRes.secure_url) {
    return next(new AppError("Failed to upload signature", 500));
  }

  // Update client signature in DB
  const client = await clientModel.findByIdAndUpdate(
    clientId,
    {
      clientSignature: uploadRes.secure_url,
      isSignatured: true,
      // permission: permission,
    },
    { new: true },
  );

  if (!client) {
    return next(new AppError("Client not found", 404));
  }

  return res.status(200).json({
    status: true,
    message: "Signature uploaded successfully",
  });
});

// <------- client signature upload end --------->

// <------ client work ------------>

// get worker for clients

exports.getClientWorkers = catchAsync(async (req, res, next) => {
  const token = req.headers["authorization"].split(" ")[1];
  if (!token) {
    return next(new AppError("Credentials missing in the headers", 400));
  }
  const { tenantId, client_id } = jwt.decode(token);
  const { c_id } = req.query;
  if (!c_id) {
    return next(new AppError("client missing", 400));
  }
  const isClient = await clientModel.findOne({ tenantId, _id: client_id });
  if (!isClient) {
    return next(new AppError("client not found", 400));
  }
  const isProject = await projectMode.findOne({
    "client_details.client": c_id,
  });
  if (!isProject) {
    return next(new AppError("The client has no project"));
  }

  if (isProject.project_workers.workers.length === 0) {
    return next(new AppError("no worker in your project"));
  }
  // console.log("client", isProject.project_workers.workers);
  const ids = isProject.project_workers.workers;
  console.log("id", ids);
  const workers = await workerModel.find({
    _id: { $in: ids },
  });
  console.log("worker", workers);
});
// <---------- client work end -------->

//
// function convertToProperHours(time) {
//   const hours = Number(time?.hours || 0);
//   const minutes = Number(time?.minutes || 0);
//   return hours + minutes / 60;
// }

// function getDayName(date) {
//   return new Date(date).toLocaleDateString("en-US", {
//     weekday: "long",
//   });
// }

// // report generate
// exports.generateReport = catchAsync(async (req, res, next) => {
//   const { p_id } = req.query;

//   if (!p_id) {
//     return next(new AppError("Project id missing", 400));
//   }

//   // 1️⃣ Get project
//   const project = await projectMode
//     .findById(p_id)
//     .populate("project_workers.workers", "worker_personal_details");

//   if (!project) {
//     return next(new AppError("Project not found", 404));
//   }

//   const workers = project.project_workers?.workers || [];

//   if (workers.length === 0) {
//     return sendSuccess(res, "No workers in project", [], 200);
//   }

//   const projectStartDate = new Date(project.project_details.project_start_date);
//   projectStartDate.setHours(0, 0, 0, 0); // VERY IMPORTANT
//   const today = new Date();
//   today.setHours(23, 59, 59, 999); // VERY IMPORTANT

//   // 2️⃣ Get all hours for project workers between dates
//   const hoursData = await hoursModel.find({
//     workerId: { $in: workers },
//   });
//   console.log("horus", hoursData);
//   // 3️⃣ Create report
//   const report = workers.map((worker) => {
//     const workerHours = hoursData.filter(
//       (h) => h.workerId.toString() === worker._id.toString()
//     );

//     let totalHours = 0;
//     const dailyHours = [];

//     workerHours.forEach((h) => {
//       const start = convertToProperHours(h.start_working_hours);
//       const finish = convertToProperHours(h.finish_hours);
//       const worked = Math.max(finish - start, 0);

//       totalHours += worked;

//       dailyHours.push({
//         date: h.createdAt.toISOString().split("T")[0],
//         day: getDayName(h.createdAt),
//         hours: worked.toFixed(2),
//       });
//     });

//     // ✅ SORT BY DATE (ASCENDING)
//     dailyHours.sort((a, b) => new Date(a.date) - new Date(b.date));

//     return {
//       name: worker.worker_personal_details?.firstName || "Unknown",
//       weekly_days: new Set(workerHours.map((h) => h.createdAt.toDateString()))
//         .size,
//       daily_hours: dailyHours,
//       total_hours: totalHours.toFixed(2),
//     };
//   });

//   // 4️⃣ Send response
//   return sendSuccess(res, "Report generated successfully", report, 200);
// });

function convertToProperHours(time) {
  const hours = Number(time?.hours || 0);
  const minutes = Number(time?.minutes || 0);
  return hours + minutes / 60;
}

function getDayName(date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthName(date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// // report generate
exports.generateReport = catchAsync(async (req, res, next) => {
  const { p_id } = req.query;

  if (!p_id) {
    return next(new AppError("Project id missing", 400));
  }

  // 1️⃣ Get project
  const project = await projectMode
    .findById(p_id)
    .populate("project_workers.workers", "worker_personal_details");

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  const workers = project.project_workers?.workers || [];

  if (workers.length === 0) {
    return sendSuccess(res, "No workers in project", [], 200);
  }

  // 2️⃣ Date range
  const projectStartDate = new Date(project.project_details.project_start_date);
  projectStartDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // 3️⃣ Get hours data (NO LOGIC CHANGE)
  const hoursData = await hoursModel.find({
    workerId: { $in: workers },
  });

  // 4️⃣ Create worker-wise daily report (SAME AS BEFORE)
  const workerReports = workers.map((worker) => {
    const workerHours = hoursData.filter(
      (h) => h.workerId.toString() === worker._id.toString(),
    );

    const dailyHours = [];
    let totalHours = 0;

    workerHours.forEach((h) => {
      const start = convertToProperHours(h.start_working_hours);
      const finish = convertToProperHours(h.finish_hours);
      const worked = Math.max(finish - start, 0);

      totalHours += worked;

      dailyHours.push({
        date: h.createdAt.toISOString().split("T")[0],
        day: getDayName(h.createdAt),
        hours: worked.toFixed(2),
      });
    });

    dailyHours.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      name: worker.worker_personal_details?.firstName || "Unknown",
      daily_hours: dailyHours,
      total_hours: totalHours.toFixed(2),
    };
  });

  // 5️⃣ MONTH → WORKERS GROUPING (NEW PART)
  const monthWiseData = {};

  workerReports.forEach((worker) => {
    worker.daily_hours.forEach((d) => {
      const monthKey = getMonthKey(d.date);

      if (!monthWiseData[monthKey]) {
        monthWiseData[monthKey] = {
          month_name: getMonthName(d.date),
          workers: [],
        };
      }

      let monthWorker = monthWiseData[monthKey].workers.find(
        (w) => w.name === worker.name,
      );

      if (!monthWorker) {
        monthWorker = {
          name: worker.name,
          daily_hours: [],
          working_days: new Set(),
          total_hours: 0,
        };
        monthWiseData[monthKey].workers.push(monthWorker);
      }

      monthWorker.daily_hours.push(d);
      monthWorker.total_hours += Number(d.hours);
      monthWorker.working_days.add(d.date);
    });
  });

  // 6️⃣ Final formatting
  Object.values(monthWiseData).forEach((month) => {
    month.workers.forEach((w) => {
      w.daily_hours.sort((a, b) => new Date(a.date) - new Date(b.date));
      w.working_days = w.working_days.size;
      w.total_hours = w.total_hours.toFixed(2);
    });
  });

  // 7️⃣ Send response
  return sendSuccess(
    res,
    "Month-wise worker report generated successfully",
    monthWiseData,
    200,
  );
});

/**
 * DOWNLOAD EXCEL – SAME UI DESIGN
 * Uses response of generateReport
 */
exports.downloadReportExcel = catchAsync(async (req, res, next) => {
  // 🔹 Capture JSON response from generateReport
  const reportResponse = await new Promise((resolve, reject) => {
    exports.generateReport(
      req,
      {
        status: () => ({
          json: (payload) => resolve(payload),
        }),
      },
      reject,
    );
  });

  const data = reportResponse.data; // monthWiseData

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Project Hours");

  const DAYS = 31;
  let row = 1;
  let grandTotal = 0;

  /* =======================
     🔵 BLUE TOP BAR
  ======================= */
  sheet.mergeCells(`A${row}:AI${row}`);
  sheet.getRow(row).height = 22;
  sheet.getCell(`A${row}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F81BD" },
  };
  row++;

  /* =======================
     🟢 TITLE
  ======================= */
  sheet.mergeCells(`B${row}:AH${row}`);
  const titleCell = sheet.getCell(`B${row}`);
  titleCell.value =
    "HERE IS HOURS FOR EACH EMPLOYEE FOR EVERY DAY THAT THEY WORKED WITH THIS PROJECT (NO SIGNATURE)";
  titleCell.font = { bold: true, size: 18, color: { argb: "FFFF0000" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9EAD3" },
  };
  row++;

  /* =======================
     📅 DATE HEADER
  ======================= */
  sheet.getCell(`A${row}`).value = "";
  for (let d = 1; d <= DAYS; d++) {
    const cell = sheet.getCell(row, d + 1);
    cell.value = d;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEAF4F8" },
    };
  }
  sheet.getCell(row, DAYS + 2).value = "Total";
  sheet.getCell(row, DAYS + 2).font = { bold: true };
  row++;

  /* =======================
     📆 DAY HEADER
  ======================= */
  sheet.getCell(`A${row}`).value = "";
  const firstMonthKey = Object.keys(data)[0];
  const [year, month] = firstMonthKey.split("-").map(Number);

  for (let d = 1; d <= DAYS; d++) {
    const day = new Date(year, month - 1, d).toLocaleDateString("en-US", {
      weekday: "short",
    })[0];
    const cell = sheet.getCell(row, d + 1);
    cell.value = day;
    cell.font = { size: 10 };
    cell.alignment = { horizontal: "center" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEAF4F8" },
    };
  }
  row++;

  /* =======================
     📌 MONTHS + WORKERS
  ======================= */
  Object.keys(data)
    .sort()
    .forEach((monthKey) => {
      const monthData = data[monthKey];

      // Month Row
      sheet.mergeCells(`A${row}:AI${row}`);
      const mCell = sheet.getCell(`A${row}`);
      mCell.value = monthData.month_name;
      mCell.font = { bold: true };
      mCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F3F3" },
      };
      row++;

      // Worker Rows
      monthData.workers.forEach((worker) => {
        sheet.getCell(`A${row}`).value = worker.name.replace(/[_\.]/g, " ");
        sheet.getCell(`A${row}`).font = { bold: true };

        const hoursMap = {};
        worker.daily_hours.forEach((h) => {
          const day = new Date(h.date).getDate();
          hoursMap[day] = (
            parseFloat(hoursMap[day] || 0) + parseFloat(h.hours)
          ).toFixed(2);
        });

        for (let d = 1; d <= DAYS; d++) {
          sheet.getCell(row, d + 1).value = hoursMap[d] || "";
        }

        sheet.getCell(row, DAYS + 2).value = worker.total_hours;
        grandTotal += parseFloat(worker.total_hours);
        row++;
      });
    });

  /* =======================
     🧮 GRAND TOTAL
  ======================= */
  sheet.getCell(`A${row}`).value = "GRAND TOTAL";
  sheet.getCell(`A${row}`).font = { bold: true };
  sheet.getCell(row, DAYS + 2).value = grandTotal.toFixed(2);
  sheet.getCell(row, DAYS + 2).font = { bold: true };

  // Column width
  sheet.columns.forEach((c) => (c.width = 12));

  /* =======================
     ⬇️ SEND FILE
  ======================= */
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=project_hours_report.xlsx",
  );

  await workbook.xlsx.write(res);
  res.end();
});

// <------ generate weekly time sheet with all filter ------->

// //step 1- check filter -> project,worker,status,date
// exports.weeklyReport = catchAsync(async (req, res, next) => {
//   const requiredFields = ["project", "worker", "status", "date"];

//   for (let field of requiredFields) {
//     if (!req.query[field] || req.query[field].toString().trim().length === 0) {
//       return next(new AppError(`${field} missing in filter`, 400));
//     }
//   }

//   const { project, worker } = req.query;

//   // ✅ PROJECT: EXCLUDE UNWANTED FIELDS
//   const filterProject = await projectMode
//     .findById(project)
//     .select(
//       "-daily_work_hour -project_workers -project_details_for_workers -project_time_economical_details"
//     )
//     .lean();

//   if (!filterProject) {
//     return next(new AppError("project not found", 400));
//   }
//   const filterClient = await clientModel.findById(
//     filterProject.client_details.client
//   ).select(`
//     -additional_information,
//     -isDelete,
//     -client_url
//     -contact_details
//     -additional_information

//     `);
//   // ✅ WORKER: EXCLUDE UNWANTED DATA
//   const filterWorker = await hoursModel
//     .findOne({ workerId: worker })
//     .populate({
//       path: "workerId",
//       select: `
//       -activation_date
//       -worker_hours_access_settings
//       -worker_tools_access_settings
//       -other_access_settings
//       -worker_holiday
//       -isDelete
//       -isActive
//       -dashboardUrl
//       -urlVisibleToAdmin
//       -urlAdminExpireAt
//       -personal_information
//       -worker_economical_data
//       -__v
//     `,
//     })
//     .lean();

//   if (!filterWorker) {
//     return next(new AppError("worker not found", 404));
//   }

//   //  HOURS DATA

//   const hoursData = await hoursModel.find({ workerId: { $in: worker } });
//   if (!hoursData) {
//     return next(new AppError("hours not found", 400));
//   }

//   // ✅ FINAL RESPONSE STRUCTURE
//   const data = {
//     project: filterProject,
//     client: filterClient,
//     worker: filterWorker.workerId,
//     hours: hoursData,
//   };

//   return sendSuccess(res, "Weekly report data fetched", data, 200, true);
// });

// //  <------------ weekly time sheet report end ---------->

const convertIntoWeek = (date) => {
  const joiningDate = new Date(
    Number(date.split("-")[0]),
    Number(date.split("-")[1]) - 1,
    Number(date.split("-")[2]),
  );
  const currentMonth = new Date();

  const diffMins = currentMonth - joiningDate;
  const diffDays = Math.floor(diffMins / (1000 * 60 * 60 * 24));

  const week = Math.floor(diffDays / 7);
  return week;
};

exports.weeklyReport = catchAsync(async (req, res, next) => {
  const { workerId, date } = req.query;

  // 1️⃣ Validation
  if (!workerId || !mongoose.isValidObjectId(workerId)) {
    return next(new AppError("Invalid workerId", 400));
  }

  // 2️⃣ Date logic
  const baseDate = date ? moment(date) : moment();

  const weekStart = baseDate.startOf("isoWeek").toDate(); // Monday
  const weekEnd = baseDate.endOf("isoWeek").toDate(); // Sunday

  // 3️⃣ Fetch data
  const records = await hoursModel
    .find({
      workerId,
      createdAt: {
        $gte: weekStart,
        $lte: weekEnd,
      },
    })
    .sort({ createdAt: 1 });

  if (!records || records.length === 0) {
    return sendSuccess(res, "No records found for this week", {
      weekStart,
      weekEnd,
      totalDays: 0,
      totalHours: 0,
      data: [],
    });
  }

  // 4️⃣ Calculate total hours
  let totalMinutes = 0;

  records.forEach((rec) => {
    if (rec.day_off) return;

    const start =
      rec.start_working_hours.hours * 60 + rec.start_working_hours.minutes;

    const end = rec.finish_hours.hours * 60 + rec.finish_hours.minutes;

    let workedMinutes = end - start;

    if (rec.break_time) {
      workedMinutes -= 60; // assuming 1 hour break
    }

    totalMinutes += workedMinutes;
  });

  const totalHours = (totalMinutes / 60).toFixed(2);

  // 5️⃣ Response
  return sendSuccess(res, "Weekly report fetched successfully", {
    weekStart,
    weekEnd,
    totalDays: records.length,
    totalHours,
    data: records,
  });
});

// client name for filer section
exports.getClientNamesForFilter = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  const clients = await clientModel.find({ tenantId, isDelete: { $ne: true } });
  if (!clients || clients.length === 0) {
    return next(new AppError("no clients found", 400));
  }
  const result = [];
  clients.forEach((e, val) =>
    result.push({ name: e.client_details.client_name, _id: e._id }),
  );
  return sendSuccess(res, "Client Fetch", result, 200, true);
});

// exports.filters
