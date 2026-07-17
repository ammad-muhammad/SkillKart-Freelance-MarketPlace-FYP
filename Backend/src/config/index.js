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

  // Note: Google sign-in is handled by Supabase Auth, not here. The GOOGLE_* vars
  // belong to the Gmail email provider — see config.email.gmail below.

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
  // SMTP_* are the canonical names; the older EMAIL_* names are still honoured as
  // fallbacks so existing .env files and Railway deploys keep working untouched.
  email: {
    provider: (process.env.EMAIL_PROVIDER || 'smtp').trim().toLowerCase(),
    enabled: process.env.EMAIL_ENABLED !== 'false',
    sandbox: process.env.EMAIL_SANDBOX === 'true',
    sandboxRecipient: process.env.EMAIL_SANDBOX_RECIPIENT,

    smtp: {
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
      port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT, 10) || 587,
      secure: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true',
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      password: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM,
      fromName: process.env.SMTP_FROM_NAME || 'SkillKart'
    },

    gmail: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/oauth2callback',
      user: process.env.GOOGLE_EMAIL,
      fromName: process.env.SMTP_FROM_NAME || 'SkillKart'
    },

    // Legacy flat accessors. Kept because existing call sites read config.email.from.
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT, 10) || 587,
    secure: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true',
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    password: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
    from: process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM
  },

  // Google reCAPTCHA v3
  recaptcha: {
    secretKey: process.env.RECAPTCHA_SECRET_KEY,
    // v3 scores 0.0 (bot) → 1.0 (human). 0.5 is Google's suggested default;
    // raise to be stricter, lower if legitimate users get blocked.
    minScore: parseFloat(process.env.RECAPTCHA_MIN_SCORE) || 0.5,
    timeoutMs: parseInt(process.env.RECAPTCHA_TIMEOUT_MS, 10) || 5000
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
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    // Canonical public origin for SEO (sitemap, robots). Deliberately separate
    // from FRONTEND_URL, which is a CSV of allowed CORS origins — the first
    // entry there is not necessarily the domain the site should be indexed as.
    publicUrl:
      process.env.PUBLIC_SITE_URL ||
      String(process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim()
  },

  // SuperAdmin
  superadmin: {
    credentialsPath: process.env.SUPERADMIN_CREDENTIALS_PATH || './secure/superadmin.encrypted',
    encryptionKey: process.env.ENCRYPTION_KEY
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000
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
  },

  // ========================
  // Admin Panel (Isolated from marketplace auth)
  // ========================
  adminPanel: {
    email:          process.env.ADMIN_EMAIL,
    passwordHash:   process.env.ADMIN_PASSWORD_HASH,
    sessionTimeout: process.env.ADMIN_SESSION_TIMEOUT  || '30m',
    otpExpiry:      process.env.ADMIN_OTP_EXPIRY        || '10m',
    maxOtpAttempts: parseInt(process.env.ADMIN_MAX_OTP_ATTEMPTS || '5'),
    jwtSecret:      process.env.ADMIN_JWT_SECRET,
    panelUrl:       process.env.ADMIN_PANEL_URL          || 'http://localhost:3001',
    useRBAC:        false   // flip to true when AdminUser collection is ready for multi-admin
  }
};

module.exports = config;
