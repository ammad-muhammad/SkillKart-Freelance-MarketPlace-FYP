#!/usr/bin/env node

/**
 * Server Entry Point
 * Starts the Express server and connects to MongoDB
 */

require('dotenv').config();

const app = require('./app');
const config = require('./config');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initSupabase } = require('./config/supabase'); 

// Set port
const PORT = config.port || 5000;

// Server instance
let server;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    console.log('🚀 Starting Freelance Platform Backend...');
    console.log('========================================');

    // STRIPE_DUMMY silently simulates every payment instead of calling Stripe —
    // fine for local dev, catastrophic in production (clients would see
    // "payment successful" while no money ever actually moves). Refuse to boot
    // rather than risk it going live unnoticed.
    if (config.env === 'production' && process.env.STRIPE_DUMMY === 'true') {
      console.error('❌ STRIPE_DUMMY=true is set in a production environment. Refusing to start.');
      console.error('   Remove STRIPE_DUMMY (or set it to false) and provide a real STRIPE_SECRET_KEY.');
      process.exit(1);
    }

    // SKILL_TEST_EASY_MODE tells the frontend it's safe to reveal correct
    // answers (a testing-only aid) — accidentally left on in production would
    // silently defeat the entire skill-verification system the marketplace's
    // trust model depends on. Same "refuse to boot" treatment as STRIPE_DUMMY.
    if (config.env === 'production' && /^(1|true|yes)$/i.test(process.env.SKILL_TEST_EASY_MODE || '')) {
      console.error('❌ SKILL_TEST_EASY_MODE is enabled in a production environment. Refusing to start.');
      console.error('   Remove SKILL_TEST_EASY_MODE (or set it to false) before deploying to production.');
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await connectDB();

    // Connect to Redis (optional)
    console.log('📦 Connecting to Redis...');
    try {
      connectRedis();
    } catch (error) {
      console.log('⚠️  Redis connection failed, continuing without cache');
    }

    // Initialize Supabase (optional)
    console.log('📦 Initializing Supabase...');
    try {
      initSupabase();
    } catch (error) {
      console.log('⚠️  Supabase initialization failed, auth will use local only');
    }

    // Check AI Service Health
    console.log('🧠 Verifying AI Service connection...');
    const { checkAIHealth } = require('./services/ai');
    const aiHealth = await checkAIHealth();
    if (aiHealth.status === 'success') {
      console.log(`✅ AI Service connected (${aiHealth.provider})`);
    } else {
      console.log(`⚠️  AI Service failed to connect (${aiHealth.provider}): ${aiHealth.error}`);
      console.log('⚠️  Proceeding without AI features');
    }

    // Initialize Email Provider
    console.log('📧 Initializing Email Provider...');
    const { initEmail, labelFor } = require('./config/email');
    const emailHealth = await initEmail();
    if (emailHealth.status === 'success') {
      console.log(`✅ Email Provider: ${labelFor(emailHealth.provider)}`);
    } else if (emailHealth.status === 'degraded') {
      console.log(`⚠️  Email Provider: ${labelFor(emailHealth.provider)} — ${emailHealth.error}`);
    } else {
      console.log(`⚠️  Email Provider failed to initialize: ${emailHealth.error}`);
      console.log('⚠️  Proceeding without email delivery');
    }

    // Initialize cron jobs
    console.log('⏰ Initializing cron jobs...');
    try {
      const { initCronJobs } = require('./services/cron.service');
      initCronJobs();
    } catch (error) {
      console.log('⚠️  Cron job initialization failed', error.message);
    }

    // Start Express server
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log('========================================');
      console.log(`✅ Server Status: RUNNING`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌍 Environment: ${config.env}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log(`📚 API: http://localhost:${PORT}/api/${config.apiVersion}`);
      console.log(`📚 Swagger Docs: http://localhost:${PORT}/api/${config.apiVersion}/docs/`);
      console.log('========================================');

      if (config.env === 'development') {
        console.log('\n💡 Development Tips:');
        console.log('   - API docs will be available once routes are mounted');
        console.log('   - Check /health endpoint for status');
        console.log('   - MongoDB connection is active');
        console.log('   - Hot reload is enabled with nodemon\n');
      }
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          console.error(`❌ Port ${PORT} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`❌ Port ${PORT} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  ${signal} received, closing server gracefully...`);

  if (server) {
    server.close(async () => {
      console.log('✓ HTTP server closed');

      // Close database connections
      try {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('✓ MongoDB connection closed');
      } catch (error) {
        console.error('Error closing MongoDB:', error.message);
      }

      // Close Redis connection
      try {
        const { getRedisClient } = require('./config/redis');
        const redis = getRedisClient();
        if (redis) {
          await redis.quit();
          console.log('✓ Redis connection closed');
        }
      } catch (error) {
        console.error('Error closing Redis:', error.message);
      }

      console.log('👋 Server shutdown complete');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// unhandledRejection/uncaughtException are handled in app.js (operational-error-aware,
// persists to ErrorLog for the admin Monitoring page) — required above, so those
// listeners are already registered by this point.

// Start the server
startServer();

// Export for testing
module.exports = server;
