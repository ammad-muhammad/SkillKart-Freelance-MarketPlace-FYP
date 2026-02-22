/**
 * Helper Functions
 * Common utility functions used across the application
 */

const crypto = require('crypto');
const { PAGINATION } = require('./constants');

/**
 * Generate random string
 * @param {Number} length - Length of string
 * @returns {String}
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate random numeric code
 * @param {Number} length - Length of code
 * @returns {String}
 */
const generateRandomCode = (length = 6) => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
};

/**
 * Hash string using SHA256
 * @param {String} str - String to hash
 * @returns {String}
 */
const hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * Sanitize user input
 * @param {String} input - User input
 * @returns {String}
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Format phone number
 * @param {String} phone - Phone number
 * @returns {String}
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

/**
 * Parse pagination parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Parsed pagination
 */
const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(PAGINATION.MIN_LIMIT, parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Calculate pagination metadata
 * @param {Number} total - Total items
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @returns {Object}
 */
const getPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

/**
 * Sleep for specified milliseconds
 * @param {Number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate slug from string
 * @param {String} str - String to slugify
 * @returns {String}
 */
const slugify = (str) => {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Capitalize first letter
 * @param {String} str - String to capitalize
 * @returns {String}
 */
const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert to title case
 * @param {String} str - String to convert
 * @returns {String}
 */
const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalizeFirst(word))
    .join(' ');
};

/**
 * Truncate string
 * @param {String} str - String to truncate
 * @param {Number} length - Max length
 * @param {String} suffix - Suffix to add
 * @returns {String}
 */
const truncate = (str, length = 50, suffix = '...') => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length).trim() + suffix;
};

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object}
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove undefined/null values from object
 * @param {Object} obj - Object to clean
 * @returns {Object}
 */
const removeEmpty = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null)
  );
};

/**
 * Pick specific keys from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to pick
 * @returns {Object}
 */
const pick = (obj, keys) => {
  return keys.reduce((result, key) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
    return result;
  }, {});
};

/**
 * Omit specific keys from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to omit
 * @returns {Object}
 */
const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

/**
 * Check if value is empty
 * @param {*} value - Value to check
 * @returns {Boolean}
 */
const isEmpty = (value) => {
  if (value == null) return true;
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Format file size
 * @param {Number} bytes - File size in bytes
 * @returns {String}
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean}
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 * @param {String} url - URL to validate
 * @returns {Boolean}
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Format date to readable string
 * @param {Date} date - Date object
 * @param {String} format - Format type
 * @returns {String}
 */
const formatDate = (date, format = 'default') => {
  if (!date) return '';
  
  const d = new Date(date);
  
  const options = {
    default: { year: 'numeric', month: 'long', day: 'numeric' },
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  };
  
  return d.toLocaleDateString('en-US', options[format] || options.default);
};

/**
 * Calculate time difference
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object}
 */
const getTimeDifference = (startDate, endDate = new Date()) => {
  const diff = Math.abs(new Date(endDate) - new Date(startDate));
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  return {
    milliseconds: diff,
    seconds,
    minutes,
    hours,
    days
  };
};

/**
 * Get time ago string
 * @param {Date} date - Date to compare
 * @returns {String}
 */
const getTimeAgo = (date) => {
  const diff = getTimeDifference(date);
  
  if (diff.days > 30) {
    return formatDate(date, 'short');
  } else if (diff.days > 0) {
    return `${diff.days} day${diff.days > 1 ? 's' : ''} ago`;
  } else if (diff.hours > 0) {
    return `${diff.hours} hour${diff.hours > 1 ? 's' : ''} ago`;
  } else if (diff.minutes > 0) {
    return `${diff.minutes} minute${diff.minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

/**
 * Async wrapper for error handling
 * @param {Function} fn - Async function
 * @returns {Function}
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Retry async function
 * @param {Function} fn - Async function to retry
 * @param {Number} retries - Number of retries
 * @param {Number} delay - Delay between retries (ms)
 * @returns {Promise}
 */
const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await sleep(delay);
    return retry(fn, retries - 1, delay);
  }
};

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {String} key - Key to group by
 * @returns {Object}
 */
const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

/**
 * Get unique values from array
 * @param {Array} array - Array
 * @param {String} key - Key for objects
 * @returns {Array}
 */
const unique = (array, key = null) => {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

module.exports = {
  generateRandomString,
  generateRandomCode,
  hashString,
  sanitizeInput,
  formatPhoneNumber,
  parsePagination,
  getPaginationMeta,
  sleep,
  slugify,
  capitalizeFirst,
  toTitleCase,
  truncate,
  deepClone,
  removeEmpty,
  pick,
  omit,
  isEmpty,
  formatFileSize,
  isValidEmail,
  isValidUrl,
  formatDate,
  getTimeDifference,
  getTimeAgo,
  asyncHandler,
  retry,
  groupBy,
  unique
};
