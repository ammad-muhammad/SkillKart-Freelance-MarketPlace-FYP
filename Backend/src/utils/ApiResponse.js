/**
 * Standard API Response Utilities
 * Ensures consistent response format across all endpoints
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {Number} options.statusCode - HTTP status code (default: 200)
 * @param {String} options.message - Success message
 * @param {*} options.data - Response data
 * @param {Object} options.meta - Additional metadata (pagination, etc.)
 */
const sendSuccess = (res, options = {}) => {
  const {
    statusCode = 200,
    message = 'Success',
    data = null,
    meta = null
  } = options;

  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {*} data - Created resource data
 */
const sendCreated = (res, message = 'Resource created successfully', data = null) => {
  return sendSuccess(res, {
    statusCode: 201,
    message,
    data
  });
};

/**
 * Send no content response (204)
 * @param {Object} res - Express response object
 */
const sendNoContent = (res) => {
  return res.status(204).send();
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {Object} options - Error options
 * @param {Number} options.statusCode - HTTP status code (default: 500)
 * @param {String} options.message - Error message
 * @param {Array} options.errors - Array of error details
 * @param {*} options.error - Error object (for development)
 */
const sendError = (res, options = {}) => {
  const {
    statusCode = 500,
    message = 'Internal server error',
    errors = null,
    error = null
  } = options;

  const response = {
    success: false,
    message
  };

  if (errors !== null) {
    response.errors = errors;
  }

  // Include error details in development
  if (error !== null && process.env.NODE_ENV === 'development') {
    response.error = {
      stack: error.stack,
      details: error.message
    };
  }

  return res.status(statusCode).json(response);
};

/**
 * Send bad request response (400)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Array} errors - Validation errors
 */
const sendBadRequest = (res, message = 'Bad request', errors = null) => {
  return sendError(res, {
    statusCode: 400,
    message,
    errors
  });
};

/**
 * Send unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const sendUnauthorized = (res, message = 'Unauthorized') => {
  return sendError(res, {
    statusCode: 401,
    message
  });
};

/**
 * Send forbidden response (403)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const sendForbidden = (res, message = 'Forbidden') => {
  return sendError(res, {
    statusCode: 403,
    message
  });
};

/**
 * Send not found response (404)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, {
    statusCode: 404,
    message
  });
};

/**
 * Send conflict response (409)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const sendConflict = (res, message = 'Resource already exists') => {
  return sendError(res, {
    statusCode: 409,
    message
  });
};

/**
 * Send validation error response (422)
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors
 * @param {String} message - Error message
 */
const sendValidationError = (res, errors, message = 'Validation failed') => {
  return sendError(res, {
    statusCode: 422,
    message,
    errors
  });
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {Array} options.data - Array of items
 * @param {Number} options.page - Current page
 * @param {Number} options.limit - Items per page
 * @param {Number} options.total - Total items count
 * @param {String} options.message - Success message
 */
const sendPaginated = (res, options = {}) => {
  const {
    data = [],
    page = 1,
    limit = 10,
    total = 0,
    message = 'Success'
  } = options;

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return sendSuccess(res, {
    statusCode: 200,
    message,
    data,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    }
  });
};

/**
 * Send response with custom status code
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {Object} body - Response body
 */
const sendCustom = (res, statusCode, body) => {
  return res.status(statusCode).json(body);
};

/**
 * Format validation errors from express-validator
 * @param {Array} errors - Express-validator errors array
 * @returns {Array} Formatted errors
 */
const formatValidationErrors = (errors) => {
  return errors.map(err => ({
    field: err.param || err.path,
    message: err.msg,
    value: err.value
  }));
};

module.exports = {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendValidationError,
  sendPaginated,
  sendCustom,
  formatValidationErrors
};
