const { AppError, sendSuccess } = require("../../utils/errorHandler");

// <----- add Porject start ------>
const projectMode = require("../../models/projectMode");
const { catchAsync } = require("../../utils/errorHandler");
const { isValidCustomUUID } = require("custom-uuid-generator");

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
  const projects = await projectMode.find({ tenantId }).lean();
  if (!projects || projects.length === 0) {
    return next(new AppError("No projects found", 400));
  }
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
