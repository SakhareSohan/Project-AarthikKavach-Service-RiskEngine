
# Base Node.js Project Template

A clean, production-minded Node.js starter built with Express. It focuses on:
- Clear, scalable project structure
- Centralized configuration via dotenv
- Structured logging with Winston and daily rotation
- Per-request correlation IDs using AsyncLocalStorage
- Centralized, extensible error handling
- Versioned API routes

Use this template to quickly bootstrap reliable Node.js APIs/services.

---

## Table of Contents
- Overview
- Features
- Tech Stack
- Folder Structure
- Quick Start
- Configuration (.env)
- Available Scripts
- API Reference
- Middlewares
  - Correlation ID Middleware
  - Error Handling Middleware
- Utilities
  - Request Helpers
  - Custom Error Classes
- Logging
- Extending the Template
- Examples
- Troubleshooting
- License

---

## Overview

This service exposes versioned API routes under `/api`, includes a correlation ID for every request, and logs to both console and daily-rotated files. Error handling is centralized and supports custom error classes.

---

## Features

- Express server with JSON/body parsing
- Versioned routing (`/api/v1`)
- Health/info endpoint (`/api/v1/info`)
- Correlation ID carried across async boundaries
- Structured JSON logging (timestamp + correlationId)
- Centralized and typed error handling
- Easily extensible services/repositories layout

---

## Tech Stack

- Node.js
- Express
- dotenv
- winston + winston-daily-rotate-file
- http-status-codes
- async_hooks (AsyncLocalStorage)
- crypto (UUID via `randomUUID`)

---

## Folder Structure

```
Base-Node-Project-Template
├── .gitignore
├── package.json
├── README.md
├── logs/
│   ├── <date>-app.log                 # Daily rotated logs (e.g., 2025-11-11-app.log)
│   └── .<hash>-audit.json             # Rotation audit file (managed by winston)
└── src/
    ├── index.js                       # App entrypoint
    ├── config/
    │   ├── index.js                   # Config aggregator
    │   ├── server-config.js           # dotenv setup; exports PORT
    │   └── logger-config.js           # Winston setup (JSON + correlationId)
    ├── routes/
    │   ├── index.js                   # Mounts version routers under /api
    │   └── v1/
    │       └── index.js               # v1 routes (GET /info)
    ├── controllers/
    │   ├── index.js                   # Controllers aggregator
    │   └── info-controller.js         # Health/Info controller
    ├── middlewares/
    │   ├── index.js                   # Middlewares aggregator
    │   ├── correlation-middleware.js  # Adds correlationId to AsyncLocalStorage + header
    │   └── error-middleware.js        # AppError handler + generic 500 handler
    ├── repositories/
    │   └── index.js                   # Placeholder for data-access layer
    ├── services/
    │   └── index.js                   # Placeholder for business logic
    └── utils/
        ├── index.js                   # Utils aggregator
        ├── errors/
        │   └── app-error.js           # Custom error classes
        └── helpers/
            └── request.helpers.js     # AsyncLocalStorage + getCorrelationId()
```

---

## Quick Start

1) Install dependencies
```bash
npm install
```

2) Create a `.env` file in the project root with at least:
```bash
PORT=3000
LOG_LEVEL=info
```

3) Start the development server
```bash
npm run dev
```

4) Test the health endpoint
```bash
curl http://localhost:3000/api/v1/info
```

Expected response:
```json
{
  "success": true,
  "message": "API is live",
  "error": {},
  "data": {}
}
```

---

## Configuration (.env)

- `PORT` — Port for the HTTP server (e.g., `3000`)
- `LOG_LEVEL` — Logging level for Winston (`error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`). Defaults to `info`.

`.env` is included in `.gitignore` to avoid accidental commits.

---

## Available Scripts

- `npm run dev` — Start the server with nodemon (auto-reloads on changes)

---

## API Reference

Base URL: `http://localhost:<PORT>/api`

- `GET /api/v1/info`
  - Returns service status and basic metadata
  - 200 OK example:
    ```json
    {
      "success": true,
      "message": "API is live",
      "error": {},
      "data": {}
    }
    ```

---

## Middlewares

### Correlation ID Middleware

Purpose:
- Generates a UUID per request using `crypto.randomUUID()`
- Attaches it to the request header `x-correlation-id`
- Stores it in `AsyncLocalStorage` so downstream code (including the logger) can fetch it with `getCorrelationId()`

Placement:
- Registered early in `src/index.js` (before routes) to ensure all logs include the correlationId.

Signature:
```js
function attachCorrelationIdMiddleware(req, res, next) { /* ... */ }
```

### Error Handling Middleware

Two layers:
- `appErrorHandler` — Handles known, custom errors (instances of `AppError` or its subclasses).
- `genericErrorHandler` — Handles all other errors, returns HTTP 500.

Order in `src/index.js`:
```js
app.use(errorMiddleware.appErrorHandler);
app.use(errorMiddleware.genericErrorHandler);
```

---

## Utilities

### Request Helpers (`src/utils/helpers/request.helpers.js`)

- `asyncLocalStorage` — Shared instance for request-scoped context
- `getCorrelationId()` — Returns current request’s correlationId, or a fallback string if unavailable

### Custom Error Classes (`src/utils/errors/app-error.js`)

Available:
- `AppError` (base)
- `InternalServerError`
- `BadRequestError`
- `NotFoundError`
- `UnauthorizedError`
- `ForbiddenError`
- `ConflictError`
- `NotImplementedError`

Import via the utils aggregator:
```js
const { appError } = require("../utils");
// Usage: throw new appError.BadRequestError("Invalid payload");
```

---

## Logging

Configured in `src/config/logger-config.js`:
- Winston logger with JSON output
- Timestamp format `MM-DD-YYYY HH:mm:ss`
- Correlation ID injected into every log record
- Transports:
  - Console (`handleExceptions: true`)
  - Daily rotated files under `logs/` (`YYYY-MM-DD-app.log`, 14-day retention)

Example log line (JSON):
```json
{
  "level": "info",
  "message": "Server is running on http://localhost:3000",
  "timestamp": "11-11-2025 10:00:00",
  "correlationId": "2b1e3c5e-...-..."
}
```

---

## Extending the Template

1) Add a controller:
```js
// src/controllers/user-controller.js
const { StatusCodes } = require("http-status-codes");

const getProfile = (req, res) => {
  return res.status(StatusCodes.OK).json({ success: true, data: { /* ... */ } });
};

module.exports = { getProfile };
```

2) Register controller:
```js
// src/controllers/index.js
module.exports = {
  InfoController: require("./info-controller"),
  UserController: require("./user-controller"),
};
```

3) Add a route:
```js
// src/routes/v1/index.js
const express = require("express");
const { InfoController, UserController } = require("../../controllers");

const router = express.Router();
router.get("/info", InfoController.info);
router.get("/user/profile", UserController.getProfile);

module.exports = router;
```

4) Use services/repositories for complex logic:
- `src/services/` for business logic
- `src/repositories/` for database access

---

## Examples

### Throw a Custom Error (Controller)
```js
const { appError } = require("../utils");

function exampleController(req, res, next) {
  try {
    // Validate input...
    throw new appError.BadRequestError("Invalid payload provided.");
  } catch (err) {
    next(err);
  }
}
```

### Log with Correlation ID
```js
const { Logger } = require("../config");

function doSomething() {
  Logger.info("Doing work in service layer", { operation: "compute" });
}
```

---

## Troubleshooting

- `TypeError: next is not a function` (in correlation middleware)
  - Cause: Middleware signature must be `(req, res, next)`. If written `(req, next)`, `next` becomes `undefined`.
  - Fix: Ensure `function attachCorrelationIdMiddleware(req, res, next) { /* ... */ }`.

- `TypeError: Right-hand side of 'instanceof' is not callable`
  - Cause: `instanceof` used against the utils object instead of a class.
  - Fix: Use `err instanceof appError.AppError` (or any subclass).

- Missing `correlationId` in logs
  - Cause: Request did not go through the correlation middleware or accessed outside an async context.
  - Fix: Ensure `app.use(correlationMiddleware)` is added before routes.

- Port already in use
  - Fix: Change `PORT` in `.env` (e.g., `3001`) and restart.

---


