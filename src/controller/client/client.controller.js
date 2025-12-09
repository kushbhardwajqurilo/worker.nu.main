const { default: mongoose } = require("mongoose");
const clientModel = require("../../models/clientModel");
const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");

// add client start here
exports.addClient = catchAsync(async (req, res, next) => {
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
  const client = await clientModel.create(req.body);
  if (!client) {
    return next(new AppError("failed to add client", 400));
  }

  sendSuccess(res, "Client add successfully", {}, 200, true);
});

// add client end here

// get all client list
exports.getAllClientController = catchAsync(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const totalClients = await clientModel.countDocuments();

  const clientList = await clientModel
    .find({})
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  if (!clientList || clientList.length === 0) {
    return next(new AppError("no client found", 400));
  }

  return sendSuccess(
    res,
    "Client list fetched successfully", // message MUST be string
    {
      total: totalClients,
      page,
      limit,
      totalPages: Math.ceil(totalClients / limit),
      clients: clientList,
    },
    200,
    true
  );
});

// get all client for admin end

// get single client details

exports.getSingleClientController = catchAsync(async (req, res, next) => {
  const { client } = req.query;
  if (!client) {
    return next(new AppError("Client Credential Missing", 400));
  }
  const isClient = await clientModel.findById(client);
  if (!isClient) {
    return next(new AppError("Client not found", 400));
  }
  return sendSuccess(res, "client found", isClient, 201, true);
});

// get single client details end

// update client only by admin

exports.updateClientController = catchAsync(async (req, res, next) => {
  const { client } = req.query;

  if (!client) {
    return next(new AppError("Client credentials missing", 400));
  }
  // Check duplicates properly
  const duplicates = await clientModel.findOne({
    _id: { $ne: client },
    $or: [
      { "client_details.client_email": req.body.client_details.client_email },
      { "contact_details.phone": req.body.contact_details.phone },
    ],
  });
  if (duplicates) {
    return next(new AppError("Email or phone already in use", 400));
  }
  // Check existing client
  const isClient = await clientModel.findById(client);
  if (!isClient) {
    return next(new AppError("Client not found", 400));
  }
  // Update client
  const updateResult = await clientModel.updateOne(
    { _id: client },
    { $set: req.body }
  );
  if (updateResult.modifiedCount === 0) {
    return next(new AppError("Update Failed, Try Again", 400));
  }
  return sendSuccess(res, "Update success", {}, 201, true);
});

//  update client only by admin end

// delete client start

exports.deleteClientController = catchAsync(async (req, res, next) => {
  const { admin_id } = req;
  const { client } = req.query;
  if (!admin_id || admin_id.toString().trim().length === 0) {
    return next(new AppError("Invalid Admin Credentials", 400));
  }
  if (!client || client.toString().trim().length === 0) {
    return next(new AppError("client credentials requried", 400));
  }
  const isClient = await clientModel.findById(client);
  if (!isClient) {
    return next(new AppError("client not found", 400));
  }
  const client_delete = await isClient.deleteOne();
  if (client_delete.deletedCount === 0) {
    return next(new AppError("Delete Failed. Try Again Later.", 400));
  }
  return sendSuccess(res, "client deleted", {}, 201, true);
});

// delete client end

// <----------- delete multiple client ----------->

exports.deleteMultipleClients = catchAsync(async (req, res, next) => {
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
    { _id: { $in: c_id } },
    { $set: { isDelete: true } }
  );
  if (!result || result.length === 0) {
    return next(new AppError("Failed to delete clients", 400));
  }
  return sendSuccess(res, "client deleted", {}, 201, true);
});

// <----------- delete multiple client end ----------->

// <------- search client ----------->

exports.searchClientController = catchAsync(async (req, res, next) => {
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
  const result = await clientModel.find(query);
  if (!result || result.length) {
    return next(new AppError("no client found"));
  }
  return sendSuccess(res, "", result, 200, true);
});

// <------- search client end ---------->
