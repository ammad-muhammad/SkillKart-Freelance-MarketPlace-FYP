/**
 * Application Constants
 * Centralized constants for the entire application
 */

// User Roles
const USER_ROLES = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  CONTENT_EDITOR: 'contenteditor',
  FREELANCER: 'freelancer',
  CLIENT: 'client',
  PUBLIC_VIEWER: 'publicviewer'
};

// Role Hierarchy (higher number = more privileges)
const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN]: 100,
  [USER_ROLES.ADMIN]: 90,
  [USER_ROLES.CONTENT_EDITOR]: 50,
  [USER_ROLES.FREELANCER]: 30,
  [USER_ROLES.CLIENT]: 30,
  [USER_ROLES.PUBLIC_VIEWER]: 10
};

// Authentication Providers
const AUTH_PROVIDERS = {
  EMAIL: 'email',
  GOOGLE: 'google',
  LINKEDIN: 'linkedin',
  GITHUB: 'github',
  SUPABASE: 'supabase'
};

// User Status
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
  PENDING: 'pending'
};

// Onboarding Steps
const ONBOARDING_STEPS = {
  FREELANCER: [
    'emailVerified',
    'profileCompleted',
    'skillTestPassed',
    'cvUploaded',
    'portfolioAdded'
  ],
  CLIENT: [
    'emailVerified',
    'profileCompleted',
    'companyVerified',
    'paymentMethodAdded',
    'firstJobPosted'
  ]
};

// Job Status
const JOB_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  CLOSED: 'closed'
};

// Proposal Status
const PROPOSAL_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

// CMS Content Status
const CMS_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  SCHEDULED: 'scheduled'
};

// CMS Page Types
const CMS_PAGE_TYPES = {
  HOME: 'home',
  ABOUT: 'about',
  CONTACT: 'contact',
  SERVICES: 'services',
  PRICING: 'pricing',
  BLOG: 'blog',
  FAQ: 'faq',
  TERMS: 'terms',
  PRIVACY: 'privacy',
  CUSTOM: 'custom'
};

// CMS Section Types
const CMS_SECTION_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  FEATURES: 'features',
  TESTIMONIALS: 'testimonials',
  PRICING: 'pricing',
  FAQ: 'faq',
  STATS: 'stats',
  TEAM: 'team',
  GALLERY: 'gallery',
  FORM: 'form',
  CTA: 'cta',
  CUSTOM: 'custom'
};

// File Types
const FILE_TYPES = {
  CV: 'cv',
  PORTFOLIO: 'portfolio',
  DOCUMENT: 'document',
  IMAGE: 'image',
  VIDEO: 'video',
  OTHER: 'other'
};

// Allowed File Extensions
const ALLOWED_FILE_EXTENSIONS = {
  IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt'],
  VIDEOS: ['.mp4', '.webm', '.ogg'],
  ALL: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.doc', '.docx', '.txt', '.mp4', '.webm', '.ogg']
};

// File Size Limits (in bytes)
const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,      // 5MB
  DOCUMENT: 10 * 1024 * 1024,  // 10MB
  VIDEO: 50 * 1024 * 1024,     // 50MB
  DEFAULT: 10 * 1024 * 1024    // 10MB
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

// OTP Settings
const OTP_SETTINGS = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 5,
  PURPOSES: {
    EMAIL_VERIFICATION: 'email_verification',
    PASSWORD_RESET: 'password_reset',
    PROFILE_UPDATE: 'profile_update',
    EMAIL_CHANGE: 'email_change',
    PHONE_VERIFICATION: 'phone_verification',
    SENSITIVE_OPERATION: 'sensitive_operation'
  }
};

// Security Settings
const SECURITY = {
  BCRYPT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_TIME: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
};

// Rate Limiting
const RATE_LIMITS = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  AUTH_MAX_REQUESTS: 5, // Stricter for auth endpoints
  SKIP_SUCCESS_REQUESTS: false
};

// Token Settings
const TOKEN_SETTINGS = {
  ACCESS_TOKEN_EXPIRE: '7d',
  REFRESH_TOKEN_EXPIRE: '30d',
  RESET_TOKEN_EXPIRE: 1 * 60 * 60 * 1000 // 1 hour
};

// Email Templates
const EMAIL_TYPES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  OTP: 'otp',
  PROPOSAL_RECEIVED: 'proposal_received',
  PROPOSAL_ACCEPTED: 'proposal_accepted',
  JOB_POSTED: 'job_posted',
  PAYMENT_RECEIVED: 'payment_received'
};

// Notification Types
const NOTIFICATION_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app'
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Date Formats
const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm:ss',
  DISPLAY: 'MMM DD, YYYY'
};

// Regular Expressions
const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHA: /^[a-zA-Z]+$/,
  NUMERIC: /^[0-9]+$/
};

// Error Messages
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'You do not have permission to access this resource',
  NOT_FOUND: 'The requested resource was not found',
  VALIDATION_FAILED: 'Please check your input and try again',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_LOCKED: 'Account is temporarily locked due to too many failed login attempts',
  ACCOUNT_BLOCKED: 'Your account has been blocked. Please contact support',
  EMAIL_EXISTS: 'An account with this email already exists',
  INVALID_TOKEN: 'Invalid or expired token',
  OTP_INVALID: 'Invalid OTP code',
  OTP_EXPIRED: 'OTP has expired. Please request a new one',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit',
  INVALID_FILE_TYPE: 'File type not allowed'
};

// Success Messages
const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  EMAIL_SENT: 'Email sent successfully',
  OTP_SENT: 'OTP sent successfully',
  PASSWORD_RESET: 'Password reset successfully',
  PROFILE_UPDATED: 'Profile updated successfully'
};

module.exports = {
  USER_ROLES,
  ROLE_HIERARCHY,
  AUTH_PROVIDERS,
  USER_STATUS,
  ONBOARDING_STEPS,
  JOB_STATUS,
  PROPOSAL_STATUS,
  CMS_STATUS,
  CMS_PAGE_TYPES,
  CMS_SECTION_TYPES,
  FILE_TYPES,
  ALLOWED_FILE_EXTENSIONS,
  FILE_SIZE_LIMITS,
  PAGINATION,
  OTP_SETTINGS,
  SECURITY,
  RATE_LIMITS,
  TOKEN_SETTINGS,
  EMAIL_TYPES,
  NOTIFICATION_TYPES,
  PAYMENT_STATUS,
  HTTP_STATUS,
  DATE_FORMATS,
  REGEX,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};
