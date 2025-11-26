// src/middlewares/index.js
const correlationMiddleware = require("./correlation-middleware");
const errorMiddleware = require("./error-middleware");
module.exports = {
  correlationMiddleware,
  errorMiddleware,
};
