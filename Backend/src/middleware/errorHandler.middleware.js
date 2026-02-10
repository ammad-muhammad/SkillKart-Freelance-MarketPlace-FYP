const { convertToApiError, isOperationalError, createErrorResponse } = require('../utils/apiError');

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof Error)) {
    error = new Error(error);
  }

  error = convertToApiError(error);

  const isDev = process.env.NODE_ENV === 'development';
  const response = createErrorResponse(error, isDev);

  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  if (!isOperationalError(error) && !isDev) {
    response.message = 'Internal server error';
  }

  res.status(error.statusCode || 500).json(response);
};

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
};

module.exports = { errorHandler, notFound };
