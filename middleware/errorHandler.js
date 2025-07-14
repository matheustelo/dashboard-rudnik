const logger = {
  error: (message, meta) => console.error(`❌ ${message}`, meta || ""),
}

const errorHandler = (err, req, res, next) => {
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  })

  // Default error
  let error = {
    message: err.message || "Internal Server Error",
    status: err.status || 500,
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case "23505": // Unique violation
        error = {
          message: "Resource already exists",
          status: 409,
        }
        break
      case "23503": // Foreign key violation
        error = {
          message: "Referenced resource not found",
          status: 400,
        }
        break
      case "23502": // Not null violation
        error = {
          message: "Required field is missing",
          status: 400,
        }
        break
      case "42P01": // Undefined table
        error = {
          message: "Database table not found",
          status: 500,
        }
        break
    }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = {
      message: "Invalid token",
      status: 401,
    }
  }

  if (err.name === "TokenExpiredError") {
    error = {
      message: "Token expired",
      status: 401,
    }
  }

  // Validation errors
  if (err.name === "ValidationError") {
    error = {
      message: "Validation failed",
      status: 400,
      details: err.details,
    }
  }

  res.status(error.status).json({
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    ...(error.details && { details: error.details }),
  })
}

module.exports = errorHandler
