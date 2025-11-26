// src/index.js
const express = require("express");
const morgan = require('morgan');
const { ServerConfig, Logger } = require("./config");
const apiRoutes = require("./routes");
const { correlationMiddleware, errorMiddleware } = require("./middlewares");

const app = express();

morgan.token('id', (req) => req.correlationId || 'unknown');
app.use(correlationMiddleware);
app.use(morgan(':method :url :status :response-time ms [cid::id]'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", apiRoutes); // Request wuill pass from here to controller
app.use(errorMiddleware.appErrorHandler);
app.use(errorMiddleware.genericErrorHandler);

app.listen(ServerConfig.PORT, () => {
  Logger.info(`Server is running on http://localhost:${ServerConfig.PORT}`);
  Logger.info(`Press Ctrl+C to stop the server.`);
});
