const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('./config');
const { swaggerUi, specs } = require('./config/swagger');

// Create Express app
const app = express();

// =======================
// Security Middleware
// =======================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      config.cors.origin,
      config.frontend.url,
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Sanitize data to prevent MongoDB injection
app.use(mongoSanitize());

// =======================
// Body Parsing Middleware
// =======================

app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Observability — persist API request records for the admin Monitoring page.
const { apiLogger, logError } = require('./middleware/requestLogger.middleware');
app.use(apiLogger);

// =======================
// Logging Middleware
// =======================

if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// =======================
// Compression
// =======================

app.use(compression());

// =======================
// Health Check
// =======================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Freelance Platform API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/v1/docs'
  });
});

// Swagger Documentation
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(specs));

// =======================
// API Routes
// =======================

const API_PREFIX = `/api/${config.apiVersion}`;

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const freelancerRoutes = require('./routes/freelancer.routes');
const clientRoutes = require('./routes/client.routes');
const adminRoutes = require('./routes/admin.routes');
const superadminRoutes = require('./routes/superadmin.routes');
const cmsRoutes = require('./routes/cms.routes');
const publicRoutes = require('./routes/public.routes');
const jobRoutes = require('./routes/job.routes');
const proposalRoutes = require('./routes/proposal.routes');
const contractRoutes = require('./routes/contract.routes');
const timeTrackingRoutes = require('./routes/timeTracking.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const gigRoutes = require('./routes/gig.routes');
const messageRoutes = require('./routes/message.routes');
const skillTestRoutes = require('./routes/skillTest.routes');
const skillRoutes = require('./routes/skill.routes');
const matchmakingRoutes = require('./routes/matchmaking.routes');
const aiRoutes = require('./routes/ai.routes');
const testimonialRoutes = require('./routes/testimonial.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');

// Mount routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/freelancers`, freelancerRoutes);
app.use(`${API_PREFIX}/clients`, clientRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/superadmin`, superadminRoutes);
app.use(`${API_PREFIX}/cms`, cmsRoutes);
app.use(`${API_PREFIX}/public`, publicRoutes);
app.use(`${API_PREFIX}/jobs`, jobRoutes);
app.use(`${API_PREFIX}/proposals`, proposalRoutes);
app.use(`${API_PREFIX}/contracts`, contractRoutes);
app.use(`${API_PREFIX}/time-tracking`, timeTrackingRoutes);
app.use(`${API_PREFIX}/deliveries`, deliveryRoutes);
app.use(`${API_PREFIX}/gigs`, gigRoutes);
app.use(`${API_PREFIX}/messages`, messageRoutes);
app.use(`${API_PREFIX}/skill-tests`, skillTestRoutes);
app.use(`${API_PREFIX}/skills`, skillRoutes);
app.use(`${API_PREFIX}/matchmaking`, matchmakingRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/testimonials`, testimonialRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);

// ========================
// Admin Panel Routes (Isolated)
// All admin routes → /api/v1/admin-panel/*
// Auth: admin_token cookie + ADMIN_JWT_SECRET (never marketplace JWT)
// ========================
const adminPanelRoutes = require('./routes/adminPanel.routes');
app.use(`${API_PREFIX}/admin-panel`, adminPanelRoutes);

// Webhook routes (no API prefix)
const supabaseWebhook = require('./webhooks/supabase.webhook');
const stripeWebhook = require('./webhooks/stripe.webhook');
app.post('/webhooks/supabase', supabaseWebhook.handleWebhook);
app.use('/webhooks/stripe', stripeWebhook);


// =======================
// 404 Handler
// =======================

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// =======================
// Global Error Handler
// =======================

app.use((err, req, res, next) => {
  // Log error (console + persistent ErrorLog for the admin Monitoring page)
  console.error('Error:', err);
  logError(err, req);

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      error: config.env === 'development' ? err.message : undefined
    });
  }

  // Validation errors (Mongoose or Custom)
  if (err.name === 'ValidationError') {
    // If it's a Mongoose error, it has an 'errors' object where values have 'message'
    // If it's our Custom ValidationError, it has an 'errors' array of objects with 'field' and 'message'
    const formattedErrors = Array.isArray(err.errors) 
      ? err.errors 
      : Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));

    return res.status(400).json({
      success: false,
      message: err.message || 'Validation error',
      errors: formattedErrors
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // MongoDB CastError (invalid ObjectId or type mismatch)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid value for ${err.path}: ${err.value}`,
      errors: [err.message]
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    error: config.env === 'development' ? err.stack : undefined
  });
});

// =======================
// Graceful Shutdown
// =======================

const { logFatal } = require('./middleware/requestLogger.middleware');
const { isOperationalError } = require('./utils/apiError');

process.on('unhandledRejection', (err) => {
  // Operational errors (e.g. a floated AI "service unavailable" 503, a validation
  // error, etc.) are expected and recoverable — log them but NEVER take the whole
  // server down. Only genuinely unexpected (non-operational) rejections are fatal.
  if (isOperationalError(err)) {
    console.warn('Handled operational rejection (server stays up):', err.name, '-', err.message);
    logFatal(err, 'operationalRejection');
    return;
  }

  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err ? (err.name || 'Unknown Error') : 'No error object', err ? (err.message || err) : '');
  logFatal(err, 'unhandledRejection');
  // Give the log write a brief window before exiting.
  setTimeout(() => process.exit(1), 250);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  logFatal(err, 'uncaughtException');
  setTimeout(() => process.exit(1), 250);
});

module.exports = app;
