const { isValidCustomUUID } = require("custom-uuid-generator");
const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");
const { Notification } = require("../../models/reminder.model");
const { default: mongoose } = require("mongoose");

exports.createNotification = catchAsync(async (userId, tenantId) => {
  if (!tenantId) {
    return new AppError("Tenantid missing", 400);
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invaid Tenant-id", 400));
  }
  const payload = {
    userId: req.body.userId,
    title: "worker infomation request",
    message: "xyz",
    type: "INFO",
    redirectUrl: "",
  };
  const send = await Notification.create(payload);
  if (!send) {
    return next(new AppError("Faild to create Notification", 400));
  }
  return sendSuccess(res, "Notificaton Send Successfully", {}, 200, true);
});
exports.getNotificationToWorker = catchAsync(async (req, res, next) => {
  const { tenantId, worker_id } = req;
  if (!tenantId) {
    return new AppError("Tenantid missing", 400);
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invaid Tenant-id", 400));
  }
  if (!worker_id) {
    return next(new AppError("worker id missig", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(worker_id)) {
    return next(new AppError("Invalid worker id", 400));
  }
  const payload = {
    tenantId,
    userId: worker_id,
  };
  const notifications = await Notification.find(payload)
    .select("-tenantId -userId -__v")
    .lean();
  if (!notifications) {
    return sendSuccess(res, "No Notification", [], 200, true);
  }
  return sendSuccess(res, "success", notifications, 200, true);
});

// <------------ read notification ---------------->
exports.markAsRead = catchAsync(async (req, res, next) => {
  const { tenantId, worker_id } = req;
  const { id } = req.params;
  if (!tenantId) {
    return new AppError("Tenantid missing", 400);
  }
  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invaid Tenant-id", 400));
  }
  if (!worker_id) {
    return next(new AppError("worker id missig", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(worker_id)) {
    return next(new AppError("Invalid worker id", 400));
  }
  const mark = await Notification.findOne({
    _id: id,
    tenantId,
    userId: worker_id,
  });
  if (!mark) {
    return next(new AppError("notification found", 400));
  }
  mark.read = true;
  await mark.save();
  return sendSuccess(res, "success", {}, 201, true);
});
