require('dotenv').config();

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI,
    testUri: process.env.MONGODB_TEST_URI
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: process.env.REDIS_DB || 0
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d'
  },

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },

  // OAuth - Google
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL
  },

  // OAuth - LinkedIn
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackUrl: process.env.LINKEDIN_CALLBACK_URL
  },

  // OAuth - GitHub
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL
  },

  // Email
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM
  },

  // OTP
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
    length: parseInt(process.env.OTP_LENGTH) || 6
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000'
  },

  // SuperAdmin
  superadmin: {
    credentialsPath: process.env.SUPERADMIN_CREDENTIALS_PATH || './secure/superadmin.encrypted',
    encryptionKey: process.env.ENCRYPTION_KEY
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Session
  session: {
    secret: process.env.SESSION_SECRET
  },

  // Webhook
  webhook: {
    secret: process.env.WEBHOOK_SECRET
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  // File Upload
  fileUpload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
  },

  // Logging
  log: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;
