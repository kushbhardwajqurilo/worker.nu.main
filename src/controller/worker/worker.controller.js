const { default: mongoose } = require("mongoose");
const {
  catchAsync,
  sendSuccess,
  AppError,
} = require("../../utils/errorHandler");
const {
  workerModel,
  workerPositionModel,
} = require("../../models/workerModel");
const { holidayModel, sicknessModel } = require("../../models/leavesModel");
const { isValidCustomUUID } = require("custom-uuid-generator");
const jwt = require("jsonwebtoken");
const {
  HolidaySickness,
} = require("../../models/settingModels/settings.model");
const uploadSignature = require("../../middleware/signature.middleware");
const projectMode = require("../../models/projectMode");
const hoursModel = require("../../models/hoursModel");
const { calculateAge, formatDateUTC } = require("../../utils/calcuateAge");

// ----------------------------------------- ADMIN DASHBOARD API'S -----------------------------------------------

// <---------- Add Worker Start Here ------------>

// exports.addWorker = catchAsync(async (req, res, next) => {
//   console.log("data", req.body);
//   const { tenantId } = req;

//   if (!isValidCustomUUID(tenantId)) {
//     return next(new AppError("Invalid Tenant-Id", 400));
//   }

//   if (!req.body || Object.keys(req.body).length === 0) {
//     return next(new AppError("Worker details missing", 400));
//   }

//   // ---- phone validation ----
//   const phone = req.body?.worker_personal_details?.phone;
//   if (!phone) {
//     return next(new AppError("Worker phone number required", 400));
//   }

//   const isWorker = await workerModel.findOne({
//     tenantId,
//     "worker_personal_details.phone": phone,
//   });

//   if (isWorker) {
//     return next(new AppError("Worker phone already registered", 400));
//   }
//   let language = req.body.language;

//   if (typeof language === "string") {
//     language = JSON.parse(language);
//   }

//   // lowercase enforce (important)
//   language = language.map((l) => l.toLowerCase());
//   // ================= FILE HANDLING =================
//   const files = req.files || {};

//   const documents = {
//     profile_picture: files.profile_picture
//       ? files.profile_picture[0].path
//       : null,

//     drivers_license: files.drivers_license
//       ? files.drivers_license[0].path
//       : null,

//     passport: files.passport ? files.passport[0].path : null,

//     national_id_card: files.national_id_card
//       ? files.national_id_card[0].path
//       : null,

//     worker_work_id: files.worker_work_id ? files.worker_work_id[0].path : null,

//     other_files: files.other_files
//       ? files.other_files.map((file) => ({
//           folderName: "other_files",
//           file: file.path,
//         }))
//       : [],
//   };

//   // ================= PAYLOAD =================
//   const payload = {
//     tenantId,
//     ...req.body,
//     language,
//     personal_information: {
//       ...(req.body.personal_information || {}),
//       documents,
//     },
//   };

//   // ================= CREATE WORKER =================
//   const insert = await workerModel.create(payload);

//   if (!insert) {
//     return next(new AppError("Failed to add worker", 400));
//   }

//   // ================= HOLIDAY SETTINGS =================
//   const isHolidays = await HolidaySickness.findOne({ tenantId });

//   if (isHolidays) {
//     insert.worker_holiday.holidays_per_month = isHolidays.holiday.monthly_limit;

//     insert.worker_holiday.remaining_holidays = isHolidays.holiday.monthly_limit;

//     insert.worker_holiday.sickness_per_month =
//       isHolidays.sickness.monthly_limit;

//     insert.worker_holiday.remaining_sickness =
//       isHolidays.sickness.monthly_limit;
//   }

//   // ================= DASHBOARD LINK =================
//   insert.dashboardUrl = `https://4frnn03l-8002.inc1.devtunnels.ms/worker?w_id=${insert._id}`;

//   insert.urlVisibleToAdmin = true;
//   insert.urlAdminExpireAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

//   await insert.save();

//   return sendSuccess(res, "Worker added successfully", insert, 200, true);
// });

exports.addWorker = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  // ================= BASIC VALIDATION =================
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError("Worker details missing", 400));
  }

  // ================= PARSE worker_personal_details =================
  let workerPersonalDetails = req.body.worker_personal_details;
  if (typeof workerPersonalDetails === "string") {
    workerPersonalDetails = JSON.parse(workerPersonalDetails);
  }

  // ================= PHONE CHECK =================
  const phone = workerPersonalDetails?.phone;

  if (!phone) {
    return next(new AppError("Worker phone number required", 400));
  }

  const isWorker = await workerModel.findOne({
    tenantId,
    "worker_personal_details.phone": phone,
  });

  if (isWorker) {
    return next(new AppError("Worker phone already registered", 400));
  }

  let worker_economical_data = req.body.worker_economical_data;
  if (typeof worker_economical_data === "string") {
    worker_economical_data = JSON.parse(worker_economical_data);
  }

  let isActive = req.body.isActive;
  if (typeof isActive === "string") {
    isActive = JSON.parse(isActive);
  }
  // ================= LANGUAGE PARSE =================
  let language = req.body.language || [];
  if (typeof language === "string") {
    language = JSON.parse(language);
  }
  language = language.map((l) => l.toLowerCase());

  // ================= PARSE project (🔥 MAIN FIX) =================
  let project = req.body.project;
  if (typeof project === "string") {
    project = JSON.parse(project);
  }
  let worker_position = req.body.worker_position || [];

  if (typeof worker_position === "string") {
    worker_position = JSON.parse(worker_position);
  }

  // Ensure ObjectId array
  worker_position = worker_position.map(
    (id) => new mongoose.Types.ObjectId(id)
  );
  // ================= PARSE personal_information =================
  let personalInformation = req.body.personal_information;
  if (typeof personalInformation === "string") {
    personalInformation = JSON.parse(personalInformation);
  }

  // ================= FILE HANDLING (UNCHANGED) =================
  const documents = {
    profile_picture: null,
    drivers_license: null,
    passport: null,
    national_id_card: null,
    worker_work_id: null,
    other_files: [],
  };

  const otherFilesMap = {};

  if (Array.isArray(req.files)) {
    req.files.forEach((file) => {
      const field = file.fieldname;

      // ---- SINGLE FILES ----
      if (field === "profile_picture") {
        documents.profile_picture = file.path;
      }
      if (field === "drivers_license") {
        documents.drivers_license = file.path;
      }
      if (field === "passport") {
        documents.passport = file.path;
      }
      if (field === "national_id_card") {
        documents.national_id_card = file.path;
      }
      if (field === "worker_work_id") {
        documents.worker_work_id = file.path;
      }

      // ---- OTHER FILES (nested like other_files.0.files) ----
      const match = field.match(/other_files\.(\d+)\.files/);
      if (match) {
        const index = match[1];

        if (!otherFilesMap[index]) {
          otherFilesMap[index] = {
            folderName:
              req.body[`other_files.${index}.folder_name`] || "other_files",
            files: [],
          };
        }

        otherFilesMap[index].files.push(file.path);
      }
    });
  }

  documents.other_files = Object.values(otherFilesMap).flatMap((folder) =>
    folder.files.map((fileUrl) => ({
      folderName: folder.folderName,
      file: fileUrl,
    }))
  );

  // ================= FINAL PAYLOAD =================
  const payload = {
    tenantId,
    ...req.body,
    project, // ✅ parsed
    worker_position,
    worker_economical_data,
    isActive,
    worker_personal_details: workerPersonalDetails,
    language,
    personal_information: {
      ...(personalInformation || {}),
      documents,
    },
  };
  // ================= CREATE WORKER =================
  const worker = await workerModel.create(payload);

  if (!worker) {
    return next(new AppError("Failed to add worker", 400));
  }

  // ================= HOLIDAY SETTINGS =================
  const holidaySetting = await HolidaySickness.findOne({ tenantId });

  if (holidaySetting) {
    worker.worker_holiday.holidays_per_month =
      holidaySetting.holiday.monthly_limit;
    worker.worker_holiday.remaining_holidays =
      holidaySetting.holiday.monthly_limit;
    worker.worker_holiday.sickness_per_month =
      holidaySetting.sickness.monthly_limit;
    worker.worker_holiday.remaining_sickness =
      holidaySetting.sickness.monthly_limit;
  }
  const worker_token = jwt.sign(
    {
      worker_id: worker._id,
      tenant: tenantId,
      role: "worker",
    },
    process.env.WORKER_KEY
  );
  // ================= DASHBOARD LINK =================
  worker.dashboardUrl = `http://localhost:3000/worker?w_id=${worker._id}&tkn=${worker_token}`;
  worker.urlVisibleToAdmin = true;
  worker.urlAdminExpireAt = Date.now() + 24 * 60 * 60 * 1000;

  await worker.save();

  return sendSuccess(res, "Worker added successfully", worker, 200, true);
});

// <---------- Get Single Worker ------------->

exports.getSingleWorkerController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { worker_id } = req.query;

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid tenant-id", 400));
  }

  if (!worker_id?.trim()) {
    return next(new AppError("Worker id is required", 400));
  }

  // ================= BASE DATA =================
  const [worker, hoursTime, holidayData, sicknessData] = await Promise.all([
    workerModel
      .findOne({
        tenantId,
        _id: worker_id,
        isDelete: false,
        isActive: true,
      })
      .select(
        `-_id
         -tenantId
         -worker_position
         -language
         -isDelete
         -isActive
         -dashboardUrl
         -urlVisibleToAdmin
         -signature
         -isSign
         -urlAdminExpireAt
         -updatedAt
         -__v`
      )
      .lean(),

    hoursModel
      .findOne({ tenantId, workerId: worker_id })
      .sort({ createdAt: -1 })
      .select("total_hours createdAt")
      .lean(),

    holidayModel
      .find({ tenantId, workerId: worker_id, status: "approve" })
      .lean(),

    sicknessModel
      .find({ tenantId, workerId: worker_id, status: "approve" })
      .lean(),
  ]);

  if (!worker) {
    return next(new AppError("Worker not found", 404));
  }

  // ================= HELPERS =================
  const formatDate = (date) => new Date(date).toLocaleDateString("en-GB");
  const daysAgo = (date) =>
    Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));
  const today = new Date();

  // ================= HOLIDAY =================
  let lastHoliday = null;
  let nextHoliday = null;

  if (holidayData?.length) {
    lastHoliday =
      holidayData
        .filter(
          (h) => h.duration?.endDate && new Date(h.duration.endDate) < today
        )
        .sort(
          (a, b) => new Date(b.duration.endDate) - new Date(a.duration.endDate)
        )[0] || null;

    nextHoliday =
      holidayData
        .filter(
          (h) => h.duration?.startDate && new Date(h.duration.startDate) > today
        )
        .sort(
          (a, b) =>
            new Date(a.duration.startDate) - new Date(b.duration.startDate)
        )[0] || null;
  }

  const holiday = {
    last_holiday: lastHoliday
      ? `${formatDate(lastHoliday.duration.endDate)} (${daysAgo(
          lastHoliday.duration.endDate
        )} days ago)`
      : null,
    next_holiday: nextHoliday
      ? formatDate(nextHoliday.duration.startDate)
      : null,
  };

  // ================= SICKNESS =================
  let lastSickness = null;
  let totalSickDays = 0;

  if (sicknessData?.length) {
    totalSickDays = sicknessData.reduce(
      (sum, s) => sum + (s.duration?.totalDays || 0),
      0
    );

    lastSickness =
      sicknessData
        .filter((s) => s.duration?.endDate)
        .sort(
          (a, b) => new Date(b.duration.endDate) - new Date(a.duration.endDate)
        )[0] || null;
  }

  const HOURS_PER_DAY = 8;
  const totalWorkingDays = hoursTime?.total_hours
    ? hoursTime.total_hours / HOURS_PER_DAY
    : 0;

  const sickness = {
    last_sickness_day: lastSickness
      ? `${formatDate(lastSickness.duration.endDate)} (${daysAgo(
          lastSickness.duration.endDate
        )} days ago)`
      : null,
    total_sick_days: totalSickDays,
    percentage:
      totalWorkingDays > 0
        ? `${((totalSickDays / totalWorkingDays) * 100).toFixed(2)}%`
        : "0%",
  };

  // ================= ACTIVE PROJECTS =================
  const startOfThisMonth = new Date();
  startOfThisMonth.setDate(1);
  startOfThisMonth.setHours(0, 0, 0, 0);

  const endOfThisMonth = new Date();

  const startOfLastMonth = new Date(startOfThisMonth);
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

  const endOfLastMonth = new Date(startOfThisMonth);
  endOfLastMonth.setMilliseconds(-1);

  const [activeProjectsThisMonth, activeProjectsLastMonth] = await Promise.all([
    // THIS MONTH
    hoursModel.aggregate([
      {
        $match: {
          tenantId,
          workerId: new mongoose.Types.ObjectId(worker_id),
          "project.project_date": {
            $gte: startOfThisMonth,
            $lte: endOfThisMonth,
          },
        },
      },
      { $group: { _id: "$project.projectId" } },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },
      {
        $project: {
          _id: "$project._id",
          project_name: "$project.project_details.project_name",
        },
      },
    ]),

    // LAST MONTH
    hoursModel.aggregate([
      {
        $match: {
          tenantId,
          workerId: new mongoose.Types.ObjectId(worker_id),
          "project.project_date": {
            $gte: startOfLastMonth,
            $lte: endOfLastMonth,
          },
        },
      },
      { $group: { _id: "$project.projectId" } },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },
      {
        $project: {
          _id: "$project._id",
          project_name: "$project.project_details.project_name",
        },
      },
    ]),
  ]);

  // ================= PROFESSIONAL =================
  const professionalDetails = {
    user_created: formatDateUTC(worker.createdAt),
    worked_time: hoursTime?.total_hours ? `${hoursTime.total_hours}h` : "0h",
    last_hour_register: formatDateUTC(hoursTime?.createdAt) || null,
    hourly_salary: `$${
      worker.worker_economical_data?.worker_hourly_salary || 0
    }`,
  };

  // ================= AGE =================
  worker.personal_information.age = calculateAge(
    worker.personal_information.date_of_birth
  );

  delete worker.worker_holiday;

  // ================= RESPONSE =================
  return sendSuccess(
    res,
    "Worker fetched successfully",
    [
      {
        ...worker,
        professional_details: professionalDetails,
        holiday,
        sickness,
        projects: {
          this_month: activeProjectsThisMonth,
          last_month: activeProjectsLastMonth,
        },
      },
    ],
    200,
    true
  );
});

// <---------- Get Single Worker End ------------->

// <---------- Update worker Start ---------------->

// exports.updateWorkerController = catchAsync(async (req, res, next) => {
//   console.log("RAW BODY 👉", req.body);

//   const { tenantId } = req;

//   if (!isValidCustomUUID(tenantId)) {
//     return next(new AppError("Invalid Tenant-id", 400));
//   }

//   const { w_id } = req.query;
//   if (!w_id) {
//     return next(new AppError("Worker credential missing", 400));
//   }

//   // ================= SAFE JSON PARSER =================
//   const safeParse = (value) => {
//     if (typeof value === "string") {
//       try {
//         return JSON.parse(value);
//       } catch {
//         return value;
//       }
//     }
//     return value;
//   };

//   // ================= PARSE MULTIPART BODY =================
//   let data = {};
//   if (req.body && Object.keys(req.body).length > 0) {
//     data = {
//       worker_personal_details: safeParse(req.body.worker_personal_details),
//       worker_position: safeParse(req.body.worker_position),
//       project: safeParse(req.body.project),
//       language: safeParse(req.body.language),
//       worker_economical_data: safeParse(req.body.worker_economical_data),
//       personal_information: safeParse(req.body.personal_information),
//     };
//   }

//   if (!data || Object.keys(data).length === 0) {
//     return next(new AppError("Worker details missing", 400));
//   }

//   // ================= FIND WORKER =================
//   const worker = await workerModel.findOne({ tenantId, _id: w_id });
//   if (!worker) {
//     return next(new AppError("Worker not found", 400));
//   }

//   // ================= PHONE DUPLICATE CHECK =================
//   if (data.worker_personal_details?.phone) {
//     const isPhoneExist = await workerModel.findOne({
//       tenantId,
//       "worker_personal_details.phone": data.worker_personal_details.phone,
//       _id: { $ne: w_id },
//     });

//     if (isPhoneExist) {
//       return next(new AppError("Phone number already in use", 400));
//     }
//   }

//   // ================= FILE HANDLING =================
//   const documentsUpdate = {};
//   const otherFilesMap = {};

//   if (Array.isArray(req.files)) {
//     req.files.forEach((file) => {
//       const field = file.fieldname;

//       if (field === "profile_picture") {
//         documentsUpdate["personal_information.documents.profile_picture"] =
//           file.path;
//       }

//       if (field === "drivers_license") {
//         documentsUpdate["personal_information.documents.drivers_license"] =
//           file.path;
//       }

//       if (field === "passport") {
//         documentsUpdate["personal_information.documents.passport"] = file.path;
//       }

//       if (field === "national_id_card") {
//         documentsUpdate["personal_information.documents.national_id_card"] =
//           file.path;
//       }

//       if (field === "worker_work_id") {
//         documentsUpdate["personal_information.documents.worker_work_id"] =
//           file.path;
//       }

//       // -------- OTHER FILES --------
//       const match = field.match(/other_files\.(\d+)\.files/);
//       if (match) {
//         const index = match[1];

//         if (!otherFilesMap[index]) {
//           otherFilesMap[index] = {
//             folderName:
//               req.body[`other_files.${index}.folder_name`] || "other_files",
//             files: [],
//           };
//         }

//         otherFilesMap[index].files.push(file.path);
//       }
//     });
//   }

//   // merge old + new other_files
//   if (Object.keys(otherFilesMap).length > 0) {
//     const existingOtherFiles =
//       worker.personal_information?.documents?.other_files || [];

//     const newOtherFiles = Object.values(otherFilesMap).flatMap((folder) =>
//       folder.files.map((fileUrl) => ({
//         folderName: folder.folderName,
//         file: fileUrl,
//       }))
//     );

//     documentsUpdate["personal_information.documents.other_files"] = [
//       ...existingOtherFiles,
//       ...newOtherFiles,
//     ];
//   }

//   // ================= FINAL UPDATE PAYLOAD =================
//   const updatePayload = {
//     ...data,
//     ...(Object.keys(documentsUpdate).length > 0 ? documentsUpdate : {}),
//   };

//   // ================= UPDATE DB =================
//   const updatedWorker = await workerModel.findOneAndUpdate(
//     { tenantId, _id: w_id },
//     { $set: updatePayload },
//     { new: true, runValidators: true }
//   );

//   return sendSuccess(
//     res,
//     "Worker updated successfully",
//     updatedWorker,
//     200,
//     true
//   );
// });

exports.updateWorkerController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }

  const { w_id } = req.query;
  if (!w_id) {
    return next(new AppError("Worker credential missing", 400));
  }

  // ---------- SAFE JSON PARSE ----------
  const safeParse = (v) => {
    if (typeof v === "string") {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    }
    return v;
  };

  // ---------- PARSE BODY ----------
  let data = {
    worker_personal_details: safeParse(req.body.worker_personal_details),
    worker_position: safeParse(req.body.worker_position),
    project: safeParse(req.body.project),
    language: safeParse(req.body.language),
    worker_economical_data: safeParse(req.body.worker_economical_data),
    personal_information: safeParse(req.body.personal_information),
    isActive: safeParse(req.body.isActive),
  };

  // ---------- upload_docs -> documents FIX ----------
  if (data.personal_information?.upload_docs) {
    data.personal_information.documents = data.personal_information.upload_docs;
    delete data.personal_information.upload_docs;
  }

  // ---------- FIND WORKER ----------
  const worker = await workerModel.findOne({ tenantId, _id: w_id });
  if (!worker) {
    return next(new AppError("Worker not found", 404));
  }

  // ---------- FILE HANDLING ----------
  const documentsUpdate = {};
  const otherFilesToPush = [];

  if (Array.isArray(req.files)) {
    req.files.forEach((file) => {
      const field = file.fieldname;

      // ---- SINGLE DOCUMENTS ----
      if (
        [
          "profile_picture",
          "drivers_license",
          "passport",
          "national_id_card",
          "worker_work_id",
        ].includes(field)
      ) {
        documentsUpdate[`personal_information.documents.${field}`] = file.path;
      }

      // ---- OTHER FILES ----
      const match = field.match(/other_files\.(\d+)\.files/);
      if (match) {
        const index = Number(match[1]);
        const exists =
          worker.personal_information?.documents?.other_files?.[index];

        const folderName =
          req.body[`other_files.${index}.folder_name`] ||
          exists?.folderName ||
          "other_files";

        if (exists) {
          // UPDATE
          documentsUpdate[
            `personal_information.documents.other_files.${index}.file`
          ] = file.path;

          documentsUpdate[
            `personal_information.documents.other_files.${index}.folderName`
          ] = folderName;
        } else {
          // ADD
          otherFilesToPush.push({
            folderName,
            file: file.path,
          });
        }
      }
    });
  }

  // ---------- 🚨 PREVENT MONGO PATH CONFLICT ----------
  if (Object.keys(documentsUpdate).length > 0 || otherFilesToPush.length > 0) {
    delete data.personal_information;
  }

  // ---------- FINAL UPDATE QUERY ----------
  const updateQuery = {
    $set: {
      ...data,
      ...documentsUpdate,
    },
  };

  if (otherFilesToPush.length > 0) {
    updateQuery.$push = {
      "personal_information.documents.other_files": {
        $each: otherFilesToPush,
      },
    };
  }

  // ---------- UPDATE DB ----------
  const updatedWorker = await workerModel.findOneAndUpdate(
    { tenantId, _id: w_id },
    updateQuery,
    { new: true, runValidators: true }
  );

  return sendSuccess(
    res,
    "Worker updated successfully",
    updatedWorker,
    200,
    true
  );
});

// <---------- Update worker End ---------------->

// <---------- delete worker  --------------->
// soft delete, data will kepp in database
exports.deleteWorkerController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenatn-id", 400));
  }
  const { w } = req.query;
  if (!w || w.length === 0) {
    return next(new AppError("Worker Identification Missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(w)) {
    return next(new AppError("worker id must ObjectId", 400));
  }
  // check woker exist or not
  const isWorkerExist = await workerModel.findOneAndUpdate(
    { tenantId: tenantId, _id: w },
    {
      $set: { isDelete: true, isActive: false },
    }
  );
  if (isWorkerExist === null || isWorkerExist.length === 0) {
    return next(new AppError("Worker Not Found", 400));
  }
  return sendSuccess(res, "worker delete sucessfully", {}, 201, true);
});

//  <--------- delete worker end ------------------>

// <------- multiple delete workers ---------------->

// <-------- multile delete worker end ------------->

exports.multipleDeleteWorkerController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenatn-id", 400));
  }
  if (!req.body) {
    return next(new AppError("workers credential missing", 400));
  }
  const { w_id } = req.body;
  if (!w_id || w_id.length === 0) {
    return next(new AppError("workers credental missing", 400));
  }
  for (let id of w_id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid Worker Credentials "));
    }
  }
  const del = await workerModel.updateMany(
    { tenantId: tenantId, _id: { $in: w_id } },
    { $set: { isDelete: true, isActive: false } }
  );
  if (!del || del.length === 0) {
    return next(new AppError("failed to delete,  try again"));
  }
  return sendSuccess(res, "workers deleted", {}, 201, true);
});

// <-------- get all worker list except deleted workers ------------->

exports.getAllWorkerController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }

  // ================= PAGINATION =================
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 5;
  const skip = (page - 1) * limit;

  // ================= QUERY =================
  const query = {
    tenantId: tenantId,
    isDelete: { $ne: true },
    isActive: { $ne: false },
  };

  const totalCount = await workerModel.countDocuments(query);

  if (totalCount === 0) {
    return sendSuccess(res, "no data found", [], 200, true);
  }

  const totalPage = Math.ceil(totalCount / limit);

  // 🔥 NEW CONDITION: page > totalPage
  if (page > totalPage) {
    return sendSuccess(
      res,
      "No page found",
      {
        total: totalCount,
        page,
        limit,
        totalPage,
        worker: [],
      },
      200,
      true
    );
  }

  const workerList = await workerModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate([
      {
        path: "project.projectId",
        select: "_id project_details",
      },
      {
        path: "worker_position",
        select: "_id position",
        match: { isDelete: false }, // safety
      },
    ])
    .lean();

  // ================= MODIFY ADMIN VISIBILITY =================
  const updatedList = workerList.map((worker) => {
    const isExpired =
      worker.urlAdminExpireAt && Date.now() > worker.urlAdminExpireAt;

    return {
      ...worker,
      project: worker.project.map((p) => ({
        _id: p._id,
        projectId: p.projectId?._id || null,
        project_name: p.projectId?.project_details?.project_name || null,
      })),
      dashboardUrl:
        !isExpired && worker.urlVisibleToAdmin ? worker.dashboardUrl : null,
      urlVisibleToAdmin: !isExpired && worker.urlVisibleToAdmin,
    };
  });

  // ================= RESPONSE =================
  return sendSuccess(
    res,
    "data found",
    {
      total: totalCount,
      page,
      limit,
      totalPage,
      worker: updatedList,
    },
    200,
    true
  );
});

// <---------- get all worker list end here -------------->

// <---------- make inactive worker ------------>

exports.makeInActiveWorker = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenatn-id", 400));
  }
  const { w_id } = req.query;
  if (!w_id || w_id.length === 0) {
    return next(new AppError("worker id required", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(w_id)) {
    return next(new AppError("invaild worker id"));
  }
  const isWorkerExist = await workerModel.findOneAndUpdate(
    { tenantId: tenantId, _id: w_id },
    {
      $set: { isActive: false },
    }
  );
  if (!isWorkerExist || isWorkerExist.length === 0) {
    return next(new AppError("worker not found", 400));
  }
  return sendSuccess(res, "worker InActive", {}, 201, true);
});

// <---------- make inactive worker end------------>

// <----------- search  worker ------------>

exports.searchWorkerController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }

  const { q } = req.query;

  if (!q || q.trim().length === 0) {
    return next(new AppError("Search query required", 400));
  }

  // escape regex characters
  const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const searchQuery = {
    tenantId: tenantId,
    $or: [
      { "worker_personal_details.firstName": { $regex: safeQ, $options: "i" } },
      { "worker_personal_details.lastName": { $regex: safeQ, $options: "i" } },
      { "worker_personal_details.phone": { $regex: safeQ, $options: "i" } },
      { worker_position: { $regex: safeQ, $options: "i" } },
    ],
  };

  const workers = await workerModel
    .find(searchQuery)
    .limit(20)
    .sort({ createdAt: -1 });

  if (workers.length === 0) {
    return next(new AppError("No workers found", 404));
  }

  return sendSuccess(res, "Workers fetched successfully", workers, 200, true);
});

//  this controller for project list with name or id  for worker to assing project
exports.getAllProjectsToWorkerAddController = catchAsync(
  async (req, res, next) => {
    const { tenantId } = req;
    if (!tenantId) {
      return next(new AppError("Tenant Missing The Request", 400));
    }
    if (!isValidCustomUUID(tenantId)) {
      return next(new AppError("Invalid Tenant", 400));
    }
    const projects = await projectMode.find({ tenantId }).lean();
    if (!projects || projects.length === 0) {
      return next(new AppError("No projects found", 400));
    }
    const result = [];
    projects.forEach((val, pos) =>
      result.push({
        projectName: val.project_details.project_name,
        _id: val._id,
      })
    );
    return sendSuccess(res, "Projects fetched successfully", result, 200, true);
  }
);

// <----------- search worker end ------------>

// ------------------------------------------------ ADMIN DASHBOARD API END --------------------------------------------------

// <----------------- worker dashboard api start ------------------>

// <---------- Holiday / Sickness ------------>
exports.requestHoliday = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { w_id } = req.query;
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid tenant-id", 400));
  }

  if (!w_id) {
    return next(new AppError("w_id missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(w_id)) {
    return next(new AppError("Invalid w_id", 400));
  }

  const { range, reason } = req.body;

  if (!range || !range.startDate || !range.endDate || !reason) {
    return next(
      new AppError("startDate, endDate and reason are required", 400)
    );
  }

  const startDate = new Date(range.startDate);
  const endDate = new Date(range.endDate);

  if (startDate > endDate) {
    return next(new AppError("startDate cannot be greater than endDate", 400));
  }

  const isWorker = await workerModel.findOne({
    tenantId: tenantId,
    _id: w_id,
  });
  if (!isWorker) {
    return next(new AppError("Worker not found", 400));
  }

  if (isWorker.isDelete || !isWorker.isActive) {
    return next(new AppError("Worker not active", 400));
  }

  const totalDays =
    Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  const payload = {
    tenantId,
    workerId: w_id,
    duration: {
      startDate,
      endDate,
      totalDays,
    },
    reason: reason,
  };

  const leaveRequest = await holidayModel.create(payload);

  return sendSuccess(
    res,
    "Leave request submitted successfully",
    leaveRequest,
    201,
    true
  );
});

exports.requestSickness = catchAsync(async (req, res, next) => {
  // console.log(req.body);
  const { tenantId } = req;
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenatn-id", 400));
  }
  const { w_id } = req.query;

  // ✅ w_id validation
  if (!w_id) {
    return next(new AppError("w_id missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(w_id)) {
    return next(new AppError("Invalid w_id", 400));
  }

  const { range, description } = req.body;

  // ✅ body validation
  if (!range || !range.startDate || !range.endDate || !description) {
    return next(
      new AppError("startDate, endDate and description are required", 400)
    );
  }

  const startDate = new Date(range.startDate);
  const endDate = new Date(range.endDate);

  if (startDate > endDate) {
    return next(new AppError("startDate cannot be greater than endDate", 400));
  }

  // ✅ worker check
  const isWorker = await workerModel.findOne({ tenantId: tenantId, _id: w_id });
  if (!isWorker) {
    return next(new AppError("Worker not found", 400));
  }

  if (isWorker.isDelete || !isWorker.isActive) {
    return next(new AppError("Worker not active", 400));
  }

  // ✅ total days calculation (inclusive)
  const totalDays =
    Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  const payload = {
    tenantId: tenantId,
    workerId: w_id,
    duration: {
      startDate,
      endDate,
      totalDays,
    },
    description,
  };

  const leaveRequest = await sicknessModel.create(payload);

  return sendSuccess(
    res,
    "Leave request submitted successfully",
    leaveRequest,
    201,
    true
  );
});

// get holiday for worker
exports.getHolidays = catchAsync(async (req, res, next) => {
  const { tenant } = req.query;
  if (!isValidCustomUUID(tenant)) {
    return next(new AppError("Invalid Tenatn-id", 400));
  }
  const { w_id } = req.query;
  if (!w_id) {
    return next(new AppError("w_id missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(w_id)) {
    return next(new AppError("Invalid w_id", 400));
  }

  const result = await holidayModel.find({ tenantId: tenant, workerId: w_id });
  if (!result) {
    return next(new AppError("no holidays found", 400));
  }
  return sendSuccess(res, "success", result, 200, true);
});
exports.getSickness = catchAsync(async (req, res, next) => {
  const header = req.headers["authorization"].split(" ")[1];
  if (!header) {
    return next(new AppError("Authorization missing in the headers", 400));
  }
  const { tenant } = jwt.decode(header);
  if (!tenant) {
    return next(new AppError("tenant missing"));
  }
  if (!isValidCustomUUID(tenant)) {
    return next(new AppError("Invalid Tenatn-id", 400));
  }
  const { w_id } = req.query;
  if (!w_id) {
    return next(new AppError("w_id missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(w_id)) {
    return next(new AppError("Invalid w_id", 400));
  }

  const result = await sicknessModel.find({ tenantId: tenant, workerId: w_id });
  if (!result) {
    return next(new AppError("no holidays found", 400));
  }
  return sendSuccess(res, "success", result, 200, true);
});
// <---------- Holiday / Sickness  End------------>

// worker singature
exports.workerSignature = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenatn-id", 400));
  }
  const { w_id } = req.query;
  if (!w_id) {
    return next(new AppError("Worker id  missing", 400));
  }
  const isWorker = await workerModel.findOne({ tenantId, _id: w_id });
  if (!isWorker) {
    return next(new AppError("worker not found", 400));
  }
  if (isWorker.isDelete) {
    return next(
      new AppError("cannot upload singature of deleleted worker", 400)
    );
  }
  if (isWorker.isActive === false) {
    return next(new AppError("worker is not active", 400));
  }
  await uploadSignature(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("file size to large", 400));
      }
      return next(err);
    }
    if (!req.file) {
      return next(new AppError("signature missing", 400));
    }
    const signatureUrl = req.file.path;
    isWorker.signature = signatureUrl;
    isWorker.isSign = true;
  });
});

exports.getAllPositions = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId) {
    return next(new AppError("tenant id missing in request", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }
  const result = await workerPositionModel.find({
    tenantId,
    isDelete: { $ne: true },
  });
  if (!result || result.length === 0) {
    return next(new AppError("Position not found", 200));
  }
  const positions = [];
  result.forEach((e, pos) =>
    positions.push({ position: e.position, _id: e._id })
  );
  return sendSuccess(res, "success", positions, 200, true);
});
