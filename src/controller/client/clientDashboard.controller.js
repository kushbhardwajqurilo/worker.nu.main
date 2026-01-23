const { default: mongoose } = require("mongoose");
const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");
const clientModel = require("../../models/clientModel");
const projectMode = require("../../models/projectMode");
const { isValidCustomUUID } = require("custom-uuid-generator");
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
  const data = {
    _id: client?._id,
    isSign: client?.isSignatured,
  };
  return sendSuccess(res, "success", data, 200, true);
});

// client
