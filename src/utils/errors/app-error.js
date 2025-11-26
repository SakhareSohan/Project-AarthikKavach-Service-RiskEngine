const { StatusCodes, getReasonPhrase } = require('http-status-codes');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    this.status = getReasonPhrase(statusCode);
    Error.captureStackTrace(this, this.constructor);
  }
}

class InternalServerError extends AppError {
  constructor(message = getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR)) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

class BadRequestError extends AppError {
  constructor(message = getReasonPhrase(StatusCodes.BAD_REQUEST)) {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

class NotFoundError extends AppError {
  constructor(message = getReasonPhrase(StatusCodes.NOT_FOUND)) {
    super(message, StatusCodes.NOT_FOUND);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = getReasonPhrase(StatusCodes.UNAUTHORIZED)) {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

class ForbiddenError extends AppError {
  constructor(message = getReasonPhrase(StatusCodes.FORBIDDEN)) {
    super(message, StatusCodes.FORBIDDEN);
  }
}

class ConflictError extends AppError {
  constructor(message = getReasonPhrase(StatusCodes.CONFLICT)) {
    super(message, StatusCodes.CONFLICT);
  }
}

class NotImplementedError extends AppError {
  constructor(message = getReasonPhrase(StatusCodes.NOT_IMPLEMENTED)) {
    super(message, StatusCodes.NOT_IMPLEMENTED);
  }
}

module.exports = {
  AppError,
  InternalServerError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  NotImplementedError,
};
