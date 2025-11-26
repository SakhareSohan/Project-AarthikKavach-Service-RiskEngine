const { appError } = require("../utils");

const appErrorHandler = (err, req, res, next) => {
  if (!(err instanceof appError.AppError)) {
    return next(err);
  }
  console.log(err);

  res.status(err.statusCode).json({
    success: false,
    message: err.message
  });
};

const genericErrorHandler = (err, req, res, next) => {
  console.log(err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
};

module.exports = {
  appErrorHandler,
  genericErrorHandler
};
