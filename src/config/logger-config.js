const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const { requestHelper } = require("../utils");
const { getCorrelationId } = requestHelper || {};

const addCorrelationId = winston.format((info) => {
  try {
    info.correlationId = typeof getCorrelationId === "function"
      ? getCorrelationId()
      : "unknown";
  } catch (err) {
    info.correlationId = "unknown";
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "MM-DD-YYYY HH:mm:ss" }),
    addCorrelationId(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        addCorrelationId(),
        winston.format.printf(({ level, message, timestamp, correlationId, ...meta }) => {
          const cid = correlationId && correlationId !== 'unknown' ? `[${correlationId}]` : '';
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} ${level} ${cid}: ${message} ${metaStr}`;
        })
      )
    }),
    new DailyRotateFile({
      filename: "logs/%DATE%-app.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      handleExceptions: true,
    })
  ],
  exitOnError: false,
});

module.exports = logger;
