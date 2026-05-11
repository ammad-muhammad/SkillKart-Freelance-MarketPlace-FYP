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

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit in production, just log
  if (config.env === 'development') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Always exit on uncaught exception
  process.exit(1);
});

// Start the server
startServer();

// Export for testing
module.exports = server;
