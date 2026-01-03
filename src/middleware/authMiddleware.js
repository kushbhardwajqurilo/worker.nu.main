const jwt = require("jsonwebtoken");
const { catchAsync, AppError } = require("../utils/errorHandler");

// admin middleware
const authMiddeware = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError("Authorization header missing", 401));
  }

  // Must be: Bearer <token>
  if (!authHeader.startsWith("Bearer ")) {
    return next(new AppError("Invalid authorization format", 401));
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next(new AppError("Access token missing", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_KEY);
    req.admin_id = decoded.id;
    req.role = decoded.role;
    req.tenantId = decoded.tenant;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new AppError("Token expired. Please login again.", 401));
    }

    return next(new AppError("Invalid or malformed token", 401));
  }
});

// role base access middleware
const accessMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return next(new AppError(`access denied to ${req.role}`));
    } else next();
  };
};

const clientAuthMiddleware = catchAsync(async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return next(new AppError("Authorization missing", 400));
  }
  const cliToken = authHeader.split(" ")[1];
  if (!cliToken) {
    return next(new AppError("Token missing in the headers", 400));
  }

  let clientInfo;
  try {
    clientInfo = jwt.verify(cliToken, process.env.CLIENT_KEY);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new AppError("Token has expired. Login Again.", 400));
    }
    return next(new AppError("Authorizaion Failed", 400));
  }
  req.client_id = clientInfo.client_id;
  req.tenant = clientInfo.tenant;
  req.role = clientInfo.client_id;
  next();
});
module.exports = { authMiddeware, accessMiddleware, clientAuthMiddleware };
