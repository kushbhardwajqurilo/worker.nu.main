// global error halder
const errorHandle = (err, req, res, next) => {
  console.log("err", err);
  // agar error mai status code na ho, set default status code
  err.statusCode = err.statusCode || 500;
  err.status = err.status || false;

  // send error response
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};

// controller error handler
// use this error controller for all controllers
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : false;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// avoid try catch use this handler for try cath
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// send success handler
const sendSuccess = (
  res,
  message = "success",
  data = {},
  statusCode = 200,
  status = true
) => {
  return res.status(statusCode).json({
    status,
    message,
    data,
  });
};
module.exports = { AppError, catchAsync, errorHandle, sendSuccess };
