const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/apiError');
const { formatValidationErrors } = require('../utils/apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors.array());
    throw new ValidationError('Validation failed', formattedErrors);
  }
  next();
};

module.exports = { validate };
