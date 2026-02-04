const { AppError, sendSuccess } = require("../../utils/errorHandler");

// <----- add Porject start ------>
const projectMode = require("../../models/projectMode");
const { catchAsync } = require("../../utils/errorHandler");
const { isValidCustomUUID } = require("custom-uuid-generator");
const { default: mongoose } = require("mongoose");
const { workerModel } = require("../../models/workerModel");
const clientModel = require("../../models/clientModel");
const hoursModel = require("../../models/hoursModel");

// exports.addProjectController = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;

//   if (!tenantId || !isValidCustomUUID(tenantId)) {
//     return next(new AppError("Invalid tenant", 400));
//   }

//   // ================= SAFE JSON PARSER =================
//   const parseJSON = (value, field) => {
//     try {
//       return typeof value === "string" ? JSON.parse(value) : value;
//     } catch {
//       throw new AppError(`Invalid JSON in ${field}`, 400);
//     }
//   };

//   // ================= PARSE BODY =================
//   const project_details = parseJSON(
//     req.body.project_details,
//     "project_details",
//   );
//   const daily_work_hour_raw = parseJSON(
//     req.body.daily_work_hour,
//     "daily_work_hour",
//   );
//   const project_workers = parseJSON(
//     req.body.project_workers,
//     "project_workers",
//   );
//   const pdw_raw = parseJSON(
//     req.body.project_details_for_workers,
//     "project_details_for_workers",
//   );
//   const client_details = parseJSON(req.body.client_details, "client_details");
//   const project_time_economical_details = parseJSON(
//     req.body.project_time_economical_details,
//     "project_time_economical_details",
//   );

//   // ================= DAILY WORK HOUR =================
//   const daily_work_hour = {
//     shift_start_time: {
//       hours: Number(daily_work_hour_raw.shift_start_time.hours),
//       minutes: Number(daily_work_hour_raw.shift_start_time.minutes),
//     },
//     shift_end_time: {
//       hours: Number(daily_work_hour_raw.shift_end_time.hours),
//       minutes: Number(daily_work_hour_raw.shift_end_time.minutes),
//     },
//     break_time: Number(daily_work_hour_raw.break_time) || null,
//   };

//   // ================= FILES & FOLDERS (upload.any()) =================
//   /**
//    * req.files = [
//    *  { fieldname: "files.0", path: "url1" },
//    *  { fieldname: "files.1", path: "url2" },
//    *  { fieldname: "folders.0.files", path: "url3" }
//    * ]
//    */

//   const files = [];
//   const foldersMap = {};

//   (req.files || []).forEach((file) => {
//     // ---- NORMAL FILES ----
//     if (file.fieldname.startsWith("files.")) {
//       files.push({ file_url: file.path });
//     }

//     // ---- FOLDER FILES ----
//     if (
//       file.fieldname.startsWith("folders.") &&
//       file.fieldname.endsWith(".files")
//     ) {
//       const folderIndex = file.fieldname.split(".")[1];

//       if (!foldersMap[folderIndex]) {
//         foldersMap[folderIndex] = {
//           folder_name: req.body[`folders.${folderIndex}.folderName`] || null,
//           folder_files: [],
//         };
//       }

//       foldersMap[folderIndex].folder_files.push({
//         file_url: file.path,
//       });
//     }
//   });

//   const folders = Object.values(foldersMap);

//   // ================= PROJECT DETAILS FOR WORKERS =================
//   const project_details_for_workers = {
//     description: pdw_raw?.description || null,
//     files,
//     folders,
//     contact_information: {
//       position: pdw_raw?.contact_information?.position || null,
//       phone_code: pdw_raw?.contact_information?.phone_code || "Lithuania(+370)",
//       phone_number: Number(pdw_raw?.contact_information?.phone_number) || null,
//     },
//   };

//   // ================= FINAL PAYLOAD =================
//   const payload = {
//     tenantId,
//     project_details,
//     daily_work_hour,
//     project_workers,
//     project_details_for_workers,
//     client_details,
//     project_time_economical_details,
//   };

//   // ================= CREATE PROJECT =================
//   const project = await projectMode.create(payload);

//   return sendSuccess(
//     res,
//     "Project created successfully",
//     {
//       projectId: project.projectId,
//       _id: project._id,
//     },
//     201,
//     true,
//   );
// });

exports.addProjectController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  /* ================= TENANT VALIDATION ================= */
  if (!tenantId || !isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid tenant", 400));
  }

  /* ================= SAFE JSON PARSER ================= */
  const parseJSON = (value, field) => {
    try {
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch (err) {
      throw new AppError(`Invalid JSON in ${field}`, 400);
    }
  };

  /* ================= PARSE BODY ================= */
  const project_details = parseJSON(
    req.body.project_details,
    "project_details",
  );

  const daily_work_hour_raw = parseJSON(
    req.body.daily_work_hour,
    "daily_work_hour",
  );

  const project_workers = parseJSON(
    req.body.project_workers,
    "project_workers",
  );

  const pdw_raw = parseJSON(
    req.body.project_details_for_workers,
    "project_details_for_workers",
  );

  const client_details = parseJSON(req.body.client_details, "client_details");

  const project_time_economical_details = parseJSON(
    req.body.project_time_economical_details,
    "project_time_economical_details",
  );

  /* ================= DAILY WORK HOUR ================= */
  const daily_work_hour = {
    shift_start_time: {
      hours: Number(daily_work_hour_raw?.shift_start_time?.hours) || 0,
      minutes: Number(daily_work_hour_raw?.shift_start_time?.minutes) || 0,
    },
    shift_end_time: {
      hours: Number(daily_work_hour_raw?.shift_end_time?.hours) || 0,
      minutes: Number(daily_work_hour_raw?.shift_end_time?.minutes) || 0,
    },
    break_time: Number(daily_work_hour_raw?.break_time) || null,
  };

  /* ================= FILES & FOLDERS ================= */
  /**
   * Expected fieldnames:
   * files.0
   * files.1
   *
   * folders.0.folderName
   * folders.0.files.0
   * folders.0.files.1
   *
   * folders.1.folderName
   * folders.1.files.0
   */

  const files = [];
  const foldersMap = {};

  (req.files || []).forEach((file) => {
    /* ---------- NORMAL FILES ---------- */
    if (file.fieldname.startsWith("files.")) {
      files.push({
        file_url: file.path,
      });
    }

    /* ---------- FOLDER FILES ---------- */
    if (file.fieldname.startsWith("folders.")) {
      const parts = file.fieldname.split(".");
      // ["folders", "0", "files", "1"]

      const folderIndex = parts[1];

      // init folder if not exists
      if (!foldersMap[folderIndex]) {
        foldersMap[folderIndex] = {
          folder_name: req.body[`folders.${folderIndex}.folderName`] || null,
          folder_files: [],
        };
      }

      // push only files
      if (parts[2] === "files") {
        foldersMap[folderIndex].folder_files.push({
          file_url: file.path,
        });
      }
    }
  });

  const folders = Object.values(foldersMap);

  /* ================= PROJECT DETAILS FOR WORKERS ================= */
  const project_details_for_workers = {
    description: pdw_raw?.description || null,
    files,
    folders,
    contact_information: {
      position: pdw_raw?.contact_information?.position || null,
      phone_code: pdw_raw?.contact_information?.phone_code || "Lithuania(+370)",
      phone_number: Number(pdw_raw?.contact_information?.phone_number) || null,
    },
  };

  /* ================= FINAL PAYLOAD ================= */
  const payload = {
    tenantId,
    project_details,
    daily_work_hour,
    project_workers,
    project_details_for_workers,
    client_details,
    project_time_economical_details,
  };
  /* ================= CREATE PROJECT ================= */
  const project = await projectMode.create(payload);
  const insertPorjectInWorker = await workerModel.updateMany(
    {
      _id: { $in: payload.project_workers.workers },
      "project.projectId": { $ne: project._id }, // 🔥 duplicate block
    },
    {
      $push: {
        project: { projectId: project._id },
      },
    },
  );

  return sendSuccess(
    res,
    "Project created successfully",
    {
      projectId: project.projectId,
      _id: project._id,
    },
    201,
    true,
  );
});

// <----- add project end --------->

// <----- get all projects start --------->

// exports.getAllProjectsController = catchAsync(async (req, res, next) => {
//   const { tenantId } = req;

//   if (!tenantId) {
//     return next(new AppError("Tenant Missing The Request", 400));
//   }

//   if (!isValidCustomUUID(tenantId)) {
//     return next(new AppError("Invalid Tenant", 400));
//   }

//   // ================= PAGINATION =================
//   const page = parseInt(req.query.page, 10) || 1;
//   const limit = parseInt(req.query.limit, 10) || 5;
//   const skip = (page - 1) * limit;

//   // ================= QUERY =================
//   const query = { tenantId, isDelete: false };

//   const totalCount = await projectMode.countDocuments(query);

//   if (totalCount === 0) {
//     return sendSuccess(res, "no data found", [], 200, true);
//   }

//   const totalPage = Math.ceil(totalCount / limit);

//   if (page > totalPage) {
//     return sendSuccess(
//       res,
//       "No page found",
//       { total: totalCount, page, limit, totalPage, projects: [] },
//       200,
//       true,
//     );
//   }

//   // ================= FETCH PROJECTS =================
//   const projects = await projectMode
//     .find(query)
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(limit)
//     .populate([
//       {
//         path: "project_workers.workers",
//         select:
//           "personal_information.documents.profile_picture worker_personal_details",
//       },
//       {
//         path: "client_details.client",
//         select: "_id client_details.client_name",
//       },
//       {
//         path: "project_time_economical_details.hourly_rate.hourly_by_position.position",
//         select: "position",
//       },
//     ])
//     .lean();

//   // ================= PROJECT IDS =================
//   const projectedIds = projects.map((p) => p._id);

//   // ================= TOTAL HOURS AGGREGATION =================
//   const projectHours = await hoursModel.aggregate([
//     {
//       $match: {
//         tenantId,
//         "project.projectId": { $in: projectedIds },
//       },
//     },
//     {
//       $group: {
//         _id: "$project.projectId",
//         totalHours: { $sum: "$total_hours" },
//       },
//     },
//     {
//       $project: {
//         totalHours: { $round: ["$totalHours", 2] },
//       },
//     },
//   ]);

//   // ================= MAP (projectId => totalHours) =================
//   const hoursMap = {};
//   projectHours.forEach((item) => {
//     hoursMap[item._id.toString()] = item.totalHours;
//   });

//   // ================= FORMAT RESPONSE =================
//   const formattedProjects = projects.map((project, index) => {
//     // workers formatting
//     if (
//       project.project_workers &&
//       Array.isArray(project.project_workers.workers)
//     ) {
//       project.project_workers.workers = project.project_workers.workers.map(
//         (worker) => ({
//           _id: worker._id,
//           worker_name: `${worker.worker_personal_details.firstName} ${worker.worker_personal_details.lastName}`,
//           profile_picture:
//             worker.personal_information?.documents?.profile_picture ?? null,
//         }),
//       );
//     }

//     // client formatting
//     let formattedClientDetails = null;
//     if (project.client_details) {
//       formattedClientDetails = {
//         _id: project.client_details.client?._id ?? null,
//         client_name:
//           project.client_details.client?.client_details?.client_name ?? null,
//         company_no: project.client_details.company_no ?? null,
//         email: project.client_details.email ?? null,
//         phone: project.client_details.phone ?? null,
//       };
//     }

//     return {
//       sr_no: (page - 1) * limit + index + 1,
//       ...project,
//       total_hours: hoursMap[project._id.toString()] ?? 0, // ✅ ONLY NUMBER
//       client_details: formattedClientDetails,
//     };
//   });

//   // ================= RESPONSE =================
//   return sendSuccess(
//     res,
//     "Projects fetched successfully",
//     {
//       total: totalCount,
//       page,
//       limit,
//       totalPage,
//       projects: formattedProjects,
//     },
//     200,
//     true,
//   );
// });

exports.getAllProjectsController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Missing The Request", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant", 400));
  }

  // ================= PAGINATION =================
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 5;
  const skip = (page - 1) * limit;

  // ================= QUERY =================
  const query = {
    tenantId,
    isDelete: false,
  };

  if (Array.isArray(req.body?.clientIds) && req.body.clientIds.length > 0) {
    query["client_details.client"] = {
      $in: req.body.clientIds.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  if (Array.isArray(req.body?.projectIds) && req.body.projectIds.length > 0) {
    query._id = {
      $in: req.body.projectIds.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  if (req.body?.status === "Completed") {
    query.is_complete = true;
  }
  if (req.body?.status === "Active") {
    query.is_complete = false;
  }
  const totalCount = await projectMode.countDocuments(query);

  if (totalCount === 0) {
    return sendSuccess(res, "no data found", [], 200, true);
  }

  const totalPage = Math.ceil(totalCount / limit);

  if (page > totalPage) {
    return sendSuccess(
      res,
      "No page found",
      { total: totalCount, page, limit, totalPage, projects: [] },
      200,
      true,
    );
  }

  // ================= FETCH PROJECTS =================
  const projects = await projectMode
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate([
      {
        path: "project_workers.workers",
        select:
          "personal_information.documents.profile_picture worker_personal_details",
      },
      {
        path: "client_details.client",
        select: "_id client_details.client_name",
      },
      {
        path: "project_time_economical_details.hourly_rate.hourly_by_position.position",
        select: "position",
      },
    ])
    .lean();

  // ================= PROJECT IDS =================
  const projectedIds = projects.map((p) => p._id);

  // ================= TOTAL HOURS AGGREGATION =================
  const projectHours = await hoursModel.aggregate([
    {
      $match: {
        tenantId,
        "project.projectId": { $in: projectedIds },
      },
    },
    {
      $group: {
        _id: "$project.projectId",
        totalHours: { $sum: "$total_hours" },
      },
    },
    {
      $project: {
        totalHours: { $round: ["$totalHours", 2] },
      },
    },
  ]);

  // ================= MAP (projectId => totalHours) =================
  const hoursMap = {};
  projectHours.forEach((item) => {
    hoursMap[item._id.toString()] = item.totalHours;
  });

  // ================= FORMAT RESPONSE =================
  const formattedProjects = projects.map((project, index) => {
    // workers formatting
    if (
      project.project_workers &&
      Array.isArray(project.project_workers.workers)
    ) {
      project.project_workers.workers = project.project_workers.workers.map(
        (worker) => ({
          _id: worker._id,
          worker_name: `${worker.worker_personal_details.firstName} ${worker.worker_personal_details.lastName}`,
          profile_picture:
            worker.personal_information?.documents?.profile_picture ?? null,
        }),
      );
    }

    // client formatting
    let formattedClientDetails = null;
    if (project.client_details) {
      formattedClientDetails = {
        _id: project.client_details.client?._id ?? null,
        client_name:
          project.client_details.client?.client_details?.client_name ?? null,
        company_no: project.client_details.company_no ?? null,
        email: project.client_details.email ?? null,
        phone: project.client_details.phone ?? null,
      };
    }

    return {
      sr_no: (page - 1) * limit + index + 1,
      ...project,
      total_hours: hoursMap[project._id.toString()] ?? 0, // ✅ ONLY NUMBER
      client_details: formattedClientDetails,
    };
  });

  // ================= RESPONSE =================
  return sendSuccess(
    res,
    "Projects fetched successfully",
    {
      total: totalCount,
      page,
      limit,
      totalPage,
      projects: formattedProjects,
    },
    200,
    true,
  );
});

// <----- get all projects end --------->

// <----- get single project start --------->
exports.getSingleProjectController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId) {
    return next(new AppError("Tenant Missing The Request", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant", 400));
  }
  const { project_id } = req.query;
  if (!project_id || project_id.toString().trim().length === 0) {
    return next(new AppError("Project id missing", 400));
  }
  const project = await projectMode.findOne({ tenantId, _id: project_id });
  if (!project) {
    return next(new AppError("Project not found", 400));
  }
  return sendSuccess(res, "Project fetched successfully", project, 200, true);
});

// <----- get single project end --------->

// <----- update project start --------->
exports.updateProjectController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Missing The Request", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant", 400));
  }

  const { project_id } = req.query;
  if (!project_id || project_id.toString().trim().length === 0) {
    return next(new AppError("Project id missing", 400));
  }

  if (!req.body && !req.files?.length) {
    return next(new AppError("No update data provided", 400));
  }

  // ================= SAFE JSON PARSER =================
  const parseJSON = (value, field) => {
    try {
      if (!value) return undefined;
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      throw new AppError(`Invalid JSON in ${field}`, 400);
    }
  };

  // ================= UPDATE OBJECTS =================
  const setUpdate = {};
  const pushUpdate = {};

  // ---------- NORMAL FIELDS ----------
  if (req.body.project_details) {
    setUpdate.project_details = parseJSON(
      req.body.project_details,
      "project_details",
    );
  }

  if (req.body.daily_work_hour) {
    const dwh = parseJSON(req.body.daily_work_hour, "daily_work_hour");
    setUpdate.daily_work_hour = {
      shift_start_time: {
        hours: Number(dwh.shift_start_time.hours),
        minutes: Number(dwh.shift_start_time.minutes),
      },
      shift_end_time: {
        hours: Number(dwh.shift_end_time.hours),
        minutes: Number(dwh.shift_end_time.minutes),
      },
      break_time: Number(dwh.break_time) || null,
    };
  }

  if (req.body.project_workers) {
    setUpdate.project_workers = parseJSON(
      req.body.project_workers,
      "project_workers",
    );
  }

  if (req.body.client_details) {
    setUpdate.client_details = parseJSON(
      req.body.client_details,
      "client_details",
    );
  }

  if (req.body.project_time_economical_details) {
    setUpdate.project_time_economical_details = parseJSON(
      req.body.project_time_economical_details,
      "project_time_economical_details",
    );
  }

  // ================= FILES & FOLDERS (upload.any()) =================
  /**
   * req.files = [
   *  { fieldname: "files.0", path: "url1" },
   *  { fieldname: "folders.0.files", path: "url2" }
   * ]
   */

  const filesToPush = [];
  const foldersMap = {};

  (req.files || []).forEach((file) => {
    // ---- NORMAL FILES ----
    if (file.fieldname.startsWith("files.")) {
      filesToPush.push({ file_url: file.path });
    }

    // ---- FOLDER FILES ----
    if (
      file.fieldname.startsWith("folders.") &&
      file.fieldname.endsWith(".files")
    ) {
      const folderIndex = file.fieldname.split(".")[1];

      if (!foldersMap[folderIndex]) {
        foldersMap[folderIndex] = {
          folder_name: req.body[`folders.${folderIndex}.folderName`] || null,
          folder_files: [],
        };
      }

      foldersMap[folderIndex].folder_files.push({
        file_url: file.path,
      });
    }
  });

  // ---------- PUSH OPERATIONS ----------
  if (filesToPush.length) {
    pushUpdate["project_details_for_workers.files"] = {
      $each: filesToPush,
    };
  }

  if (Object.keys(foldersMap).length) {
    pushUpdate["project_details_for_workers.folders"] = {
      $each: Object.values(foldersMap),
    };
  }

  // ---------- DESCRIPTION / CONTACT UPDATE ----------
  if (req.body.project_details_for_workers) {
    const pdw = parseJSON(
      req.body.project_details_for_workers,
      "project_details_for_workers",
    );

    if (pdw?.description) {
      setUpdate["project_details_for_workers.description"] = pdw.description;
    }

    if (pdw?.contact_information) {
      setUpdate["project_details_for_workers.contact_information"] = {
        position: pdw.contact_information.position || null,
        phone_code: pdw.contact_information.phone_code || "Lithuania(+370)",
        phone_number: Number(pdw.contact_information.phone_number) || null,
      };
    }
  }

  // ================= FINAL UPDATE =================
  const updateQuery = {};
  if (Object.keys(setUpdate).length) updateQuery.$set = setUpdate;
  if (Object.keys(pushUpdate).length) updateQuery.$push = pushUpdate;

  const project = await projectMode.findOneAndUpdate(
    { tenantId, _id: project_id },
    updateQuery,
    { new: true, runValidators: true },
  );

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  return sendSuccess(res, "Project updated successfully", project, 200, true);
});

// <----- update project end --------->

// <----- delete project start --------->
exports.deleteProjectController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId) {
    return next(new AppError("Tenant Missing The Request", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant", 400));
  }
  const { p_id } = req.query;
  if (!p_id || p_id.toString().trim().length === 0) {
    return next(new AppError("Project id missing", 400));
  }
  const project = await projectMode.findByIdAndUpdate(
    p_id,
    { isDelete: true },
    { new: true },
  );
  if (!project) {
    return next(new AppError("Project not found", 400));
  }
  return sendSuccess(res, "Project deleted successfully", {}, 200, true);
});

// <----- delete project end ---------->

// add existing worker in project
exports.addWorkerInProject = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { w_id, p_id } = req.body;

  // tenant validation
  if (!tenantId || tenantId.length === 0) {
    return next(new AppError("tenant-id missing in the headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }

  // worker validation
  if (!Array.isArray(w_id) || w_id.length === 0) {
    return next(new AppError("worker missing", 400));
  }

  for (let id of w_id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid worker id", 400));
    }
  }

  // project validation
  if (!p_id || p_id.length === 0) {
    return next(new AppError("project missing", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(p_id)) {
    return next(new AppError("Invalid project id", 400));
  }

  // project check
  const project = await projectMode.findOne({
    tenantId,
    _id: p_id,
    is_complete: false,
  });

  if (!project) {
    return next(new AppError("project not found try again later", 400));
  }

  // ✅ DIRECT REPLACE workers array
  await projectMode.updateOne(
    {
      tenantId,
      _id: p_id,
    },
    {
      $set: {
        "project_workers.workers": w_id,
      },
    },
  );

  return sendSuccess(res, "worker updated successfully", {}, 200, true);
});

// worker list for project
exports.workerList = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { p_id } = req.query;

  if (!tenantId) {
    return next(new AppError("tenant-id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid tenant-id", 400));
  }

  /* ================= PROJECT WISE WORKERS ================= */
  if (p_id && p_id !== "undefined") {
    if (!mongoose.Types.ObjectId.isValid(p_id)) {
      return next(new AppError("Invalid project id", 400));
    }

    const projectData = await projectMode
      .findOne({
        tenantId,
        _id: p_id,
        isDelete: false,
      })
      .populate({
        path: "project_workers.workers",
        match: { isDelete: false },
        select:
          "worker_personal_details.firstName worker_personal_details.lastName",
      });

    if (!projectData) {
      return next(new AppError("Project not found", 404));
    }

    const workers = projectData.project_workers?.workers || [];

    const formattedData = workers.map((val) => ({
      _id: val._id,
      firstName: val.worker_personal_details?.firstName || "",
      lastName: val.worker_personal_details?.lastName || "",
    }));

    return sendSuccess(
      res,
      "Workers fetched successfully",
      formattedData,
      200,
      true,
    );
  }

  /* ================= ALL WORKERS ================= */
  const workers = await workerModel.find({
    tenantId,
    isDelete: false,
  });

  const workersList = workers.map((val) => ({
    _id: val._id,
    firstName: val.worker_personal_details?.firstName || "",
    lastName: val.worker_personal_details?.lastName || "",
  }));

  return sendSuccess(res, "Success", workersList, 200, true);
});

exports.clientList = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("tenant-id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }
  const clients = await clientModel
    .find({ isDelete: { $ne: true } })
    .select("_id client_details")
    .lean();

  if (!clients) {
    return sendSuccess(res, "no client foud", [], 200, true);
  }
  const result = clients.map((val, pos) => {
    return {
      _id: val._id,
      client_name: val.client_details.client_name,
    };
  });

  return sendSuccess(res, "client fetch", result, 200, true);
});

exports.getProjectPictures = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { p_id } = req.query;
  if (!tenantId) return next(new AppError("tenant-id missing", 400));
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }

  const worker_hours = await hoursModel
    .find({
      tenantId,
      "project.projectId": p_id,
      is_active: { $ne: false },
    })
    .populate([
      {
        path: "workerId",
        select: "worker_personal_details",
      },
    ])
    .select("project workerId total_hours comments image createdAt")
    .lean();
  if (!worker_hours) {
    return sendSuccess(res, "project pictures not found", {}, 200, true);
  }

  const filterDataa = worker_hours.map(
    ({ workerId, createdAt, project, ...rest }) => ({
      ...rest,
      date: project.project_date,
      worker: workerId
        ? {
            _id: workerId._id,
            worker_name: `${workerId.worker_personal_details.firstName} ${workerId.worker_personal_details.lastName}`,
          }
        : null,
      date_of_submission: createdAt,
    }),
  );
  return sendSuccess(res, "project picture found", filterDataa, 200, true);
});

exports.markAsComplete = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { p_id } = req.query;
  if (!tenantId) {
    return next(new AppError("tenant id missing", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid tennat-id", 400));
  }
  if (!p_id) {
    return next(new AppError("prodcut id missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(p_id)) {
    {
      return next(new AppError("Invalid Project Id"));
    }
  }
  const project = await projectMode.findOne({ tenantId, _id: p_id });
  if (!project) {
    return next(new AppError("project not found", 400));
  }

  project.is_complete = true;
  project.completedAt = new Date.now();
  await project.save();

  return sendSuccess(res, "Mark As Complete Success", {}, 201, true);
});

exports.getProjectEconomy = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { p_id } = req.query;
  if (!tenantId) {
    return next(new AppError("failed to fetch", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("invalid tenant-id", 400));
  }

  if (!p_id) {
    return next(new AppError("project missing id", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(p_id)) {
    return next(new AppError("Ivalid project id", 400));
  }
  const query = {
    tenantId,
    isDelete: false,
  };
  const [project_economy, hours] = await Promise.all([
    projectMode
      .findOne(query)
      .populate({
        path: "client_details.client",
        select: "client_details.client_name",
      })
      .lean(),
    hoursModel.find({ tenantId, "project.projectId": p_id }).lean(),
  ]);

  const total_hours = hours.reduce((sum, item) => sum + item.total_hours, 0);
  const formatedData = {
    project: {
      projectName: project_economy.project_details.project_name,
      projectLocation: project_economy.project_details.project_location_address,
      clientName:
        project_economy.client_details.client.client_details.client_name,
      status: true,
    },
    client_and_hours: {
      total_hours,
      notApproved: null,
      Approved: null,
    },
  };

  return sendSuccess(res, "data fetch", formatedData, 200, true);
});

// project worker list
exports.projectWorkerList = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { p_id } = req.query;
  if (!tenantId) {
    return next(new AppError("failed to fetch", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("invalid tenant-id", 400));
  }

  if (!p_id) {
    return next(new AppError("project missing id", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(p_id)) {
    return next(new AppError("Ivalid project id", 400));
  }
  const query = {
    tenantId,
    isDelete: false,
  };
  const projectData = await projectMode.find(query).populate({
    path: "project_workers.workers",
    select:
      "_id worker_personal_details.firstName worker_personal_details.lastName",
  });
  console.log("projectData", projectData);
});

// get project folder data
exports.getProjectFolderFile = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { p_id, f_id } = req.query;
  if (!tenantId) {
    return next(new AppError("tenant id missing", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant id", 400));
  }
  if (!p_id || !mongoose.Types.ObjectId.isValid(p_id)) {
    return next(new AppError("Invalid project credentials", 400));
  }
  if (!f_id || !mongoose.Types.ObjectId.isValid(f_id)) {
    return next(new AppError("Invalid folder credentials", 400));
  }
  const query = {
    _id: p_id,
    tenantId,
  };
  const project = await projectMode
    .findOne(query)
    .select("project_details_for_workers.folders");

  const folder = project.project_details_for_workers.folders.filter((data) =>
    data._id.equals(f_id),
  );
  const folder_files = folder ? folder : [];
  return sendSuccess(res, "success", folder_files, 200, true);
});
