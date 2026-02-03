const ApiError = require('../utils/ApiError');

/**
 * Validate request using Zod schema
 * @param {Object} schema - Zod schema object with optional body, query, params
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw new ApiError(400, 'Validation failed', true, null, formattedErrors);
      }
      throw new ApiError(400, 'Invalid request data');
    }
  };
};

module.exports = validateRequest;
