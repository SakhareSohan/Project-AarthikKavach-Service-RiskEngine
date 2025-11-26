const { randomUUID } = require('crypto');
const { asyncLocalStorage } = require("../utils/helpers/request.helpers");

function attachCorrelationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.headers["x-correlation-id"] = correlationId;
  req.correlationId = correlationId; // Attach to req object for easy access

  // Create an async stor that carries the correlationid for this requst(temp storage for request)
  asyncLocalStorage.run({ correlationId: correlationId }, () => {
    next();
  });
}

module.exports = attachCorrelationIdMiddleware;
