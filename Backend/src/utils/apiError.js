/**
 * Custom Error Classes
 * Provides structured error handling across the application
 */

/**
 * Base API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request', errors = null) {
    super(400, message, errors);
    this.name = 'BadRequestError';
  }
}

/**
 * Unauthorized Error (401)
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized - Authentication required') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error (403)
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden - Insufficient permissions') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

/**
 * Validation Error (422)
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(422, message, errors);
    this.name = 'ValidationError';
  }
}

/**
 * Internal Server Error (500)
 */
class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(500, message);
    this.name = 'InternalServerError';
  }
}

/**
 * Service Unavailable Error (503)
 */
class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable') {
    super(503, message);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Too Many Requests Error (429)
 */
class TooManyRequestsError extends ApiError {
  constructor(message = 'Too many requests, please try again later') {
    super(429, message);
    this.name = 'TooManyRequestsError';
  }
}

/**
 * Database Error
 */
class DatabaseError extends ApiError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(500, message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * Authentication Error
 */
class AuthenticationError extends ApiError {
  constructor(message = 'Authentication failed') {
    super(401, message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Token Error
 */
class TokenError extends ApiError {
  constructor(message = 'Invalid or expired token') {
    super(401, message);
    this.name = 'TokenError';
  }
}

/**
 * File Upload Error
 */
class FileUploadError extends ApiError {
  constructor(message = 'File upload failed') {
    super(400, message);
    this.name = 'FileUploadError';
  }
}

/**
 * Payment Error
 */
class PaymentError extends ApiError {
  constructor(message = 'Payment processing failed') {
    super(402, message);
    this.name = 'PaymentError';
  }
}

/**
 * Check if error is operational (safe to send to client)
 * @param {Error} error - Error object
 * @returns {Boolean}
 */
const isOperationalError = (error) => {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Create error response object
 * @param {Error} error - Error object
 * @param {Boolean} includeStack - Include stack trace
 * @returns {Object}
 */
const createErrorResponse = (error, includeStack = false) => {
  const response = {
    success: false,
    message: error.message || 'An error occurred',
    statusCode: error.statusCode || 500
  };

  if (error.errors) {
    response.errors = error.errors;
  }

  if (includeStack && error.stack) {
    response.stack = error.stack;
  }

  return response;
};

/**
 * Handle mongoose validation errors
 * @param {Error} error - Mongoose validation error
 * @returns {ValidationError}
 */
const handleMongooseValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => ({
    field: err.path,
    message: err.message,
    value: err.value,
    kind: err.kind
  }));

  return new ValidationError('Validation failed', errors);
};

/**
 * Handle mongoose duplicate key error
 * @param {Error} error - Mongoose duplicate key error
 * @returns {ConflictError}
 */
const handleMongooseDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyPattern)[0];
  const value = error.keyValue[field];
  
  return new ConflictError(`${field} '${value}' already exists`);
};

/**
 * Handle mongoose cast error
 * @param {Error} error - Mongoose cast error
 * @returns {BadRequestError}
 */
const handleMongooseCastError = (error) => {
  return new BadRequestError(`Invalid ${error.path}: ${error.value}`);
};

/**
 * Convert error to API error
 * @param {Error} error - Any error
 * @returns {ApiError}
 */
const convertToApiError = (error) => {
  // Already an API error
  if (error instanceof ApiError) {
    return error;
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    return handleMongooseValidationError(error);
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    return handleMongooseDuplicateKeyError(error);
  }

  // Mongoose cast error
  if (error.name === 'CastError') {
    return handleMongooseCastError(error);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return new TokenError(error.message);
  }

  // Default to internal server error
  return new InternalServerError(error.message);
};

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  ServiceUnavailableError,
  TooManyRequestsError,
  DatabaseError,
  AuthenticationError,
  TokenError,
  FileUploadError,
  PaymentError,
  isOperationalError,
  createErrorResponse,
  handleMongooseValidationError,
  handleMongooseDuplicateKeyError,
  handleMongooseCastError,
  convertToApiError
};
