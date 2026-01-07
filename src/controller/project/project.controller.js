const { AppError, sendSuccess } = require("../../utils/errorHandler");

// <----- add Porject start ------>
const projectMode = require("../../models/projectMode");
const { catchAsync } = require("../../utils/errorHandler");
const { isValidCustomUUID } = require("custom-uuid-generator");
const { default: mongoose } = require("mongoose");
const { workerModel } = require("../../models/workerModel");

exports.addProjectController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId) {
    return next(new AppError("Tenant Missing The Request", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant", 400));
  }
  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError("Project details missing", 400));
  }

  const {
    project_details,
    daily_work_hour,
    project_workers,
    project_details_for_workers,
    client_details,
    project_time_economical_details,
  } = req.body;

  if (
    !project_details ||
    !daily_work_hour ||
    !project_workers ||
    !project_details_for_workers ||
    !client_details ||
    !project_time_economical_details
  ) {
    return next(new AppError("Some Project details missing", 400));
  }
  const payload = {
    tenantId,
    project_details,
    daily_work_hour,
    project_workers,
    project_details_for_workers,
    client_details,
    project_time_economical_details,
  };
  const project = await projectMode.create(payload);
  if (!project) {
    return next(new AppError("failed to add project", 400));
  }
  return sendSuccess(res, "Project add successfully", {}, 200, true);
});

// <----- add project end --------->

// <----- get all projects start --------->

exports.getAllProjectsController = catchAsync(async (req, res, next) => {
  const { tenantId } = req;

  if (!tenantId) {
    return next(new AppError("Tenant Missing The Request", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant", 400));
  }

  const projects = await projectMode
    .find({ tenantId })
    .populate({
      path: "project_workers.workers",
      select: "personal_information.documents.profile_picture",
    })
    .lean();

  if (!projects || projects.length === 0) {
    return next(new AppError("No projects found", 404));
  }

  projects.forEach((project) => {
    if (
      project.project_workers &&
      Array.isArray(project.project_workers.workers)
    ) {
      project.project_workers.workers = project.project_workers.workers.map(
        (worker) => ({
          _id: worker._id,
          profile_picture:
            worker.personal_information?.documents?.profile_picture ?? null,
        })
      );
    }
  });

  return sendSuccess(res, "Projects fetched successfully", projects, 200, true);
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

  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError("No update data provided", 400));
  }

  const project = await projectMode.findOneAndUpdate(
    { tenantId, _id: project_id },
    { $set: req.body },
    { new: true, runValidators: true }
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
  const { project_id } = req.query;
  if (!project_id || project_id.toString().trim().length === 0) {
    return next(new AppError("Project id missing", 400));
  }
  const project = await projectMode.findByIdAndUpdate(
    project_id,
    { is_active: false },
    { new: true }
  );
  if (!project) {
    return next(new AppError("Project not found", 400));
  }
  return sendSuccess(res, "Project deleted successfully", project, 200, true);
});

// <----- delete project end ---------->

// add existing worker in project
exports.addWorkerInProject = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { w_id, p_id } = req.query;
  if (!tenantId || tenantId.length === 0) {
    return next(new AppError("tenant-id missig in the headers", 400));
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }
  if (!w_id || w_id.length === 0) {
    return next(new AppError("worker missing", 400));
  }
  if (!p_id || p_id.length === 0) {
    return next(new AppError("project missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(w_id)) {
    return next(new AppError("Ivalid worker id", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(p_id)) {
    return next(new AppError("Ivalid project id", 400));
  }
  const project = await projectMode.findOne({
    tenantId,
    _id: p_id,
    is_active: true,
  });
  if (!project) {
    return next(new AppError("project not found try again later", 400));
  }
  // check already assigned or not
  const assingedWorker = project.project_workers.workers.some(
    (id) => is.toString() === w_id
  );
  if (assingedWorker) {
    return next(new AppError("Worker already assigned to project", 400));
  }

  await projectMode.updateOne(
    {
      tenantId,
      _id: p_id,
    },
    {
      $addToSet: {
        "project_workers.workers": w_id,
      },
    }
  );

  return sendSuccess(res, "worker added", {}, 201, true);
});

// worker list for project
exports.workerList = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { p_id } = req.query;

  if (!tenantId) {
    return next(new AppError("tenant-id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-id", 400));
  }

  // Get all active workers
  const workers = await workerModel.find({
    tenantId,
    isDelete: false,
    isActive: true,
  });

  if (!workers || workers.length === 0) {
    return sendSuccess(res, "success", [], 200, true);
  }

  // Get project
  const workersList = workers.map((val) => {
    return {
      _id: val._id,
      firstName: val.worker_personal_details.firstName,
      lastName: val.worker_personal_details.lastName,
    };
  });

  return sendSuccess(res, "success", workersList, 200, true);
});
