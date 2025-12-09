const jwt = require("jsonwebtoken");
const { catchAsync, AppError } = require("../utils/errorHandler");

// admin middleware
const authMiddeware = catchAsync(async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return next(new AppError("Authorization Header Missing", 400));
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next(new AppError("Token Missing In The Headers", 400));
  }

  let adminInfo;

  try {
    adminInfo = jwt.verify(token, process.env.ACCESS_TOKEN_KEY);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new AppError("Token has expired. Please login again.", 401));
    }

    if (err.name === "JsonWebTokenError") {
      return next(new AppError("Invalid token.", 401));
    }

    return next(new AppError("Authorization failed.", 401));
  }

  req.admin_id = adminInfo.id;
  req.role = adminInfo.role;
  next();
});

// role base access middleware
const accessMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return next(new AppError(`access denied to ${req.role}`));
    } else next();
  };
};
module.exports = { authMiddeware, accessMiddleware };
