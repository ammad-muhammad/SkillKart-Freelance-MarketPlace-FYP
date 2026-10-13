const Redis = require('ioredis');
const config = require('./index');

let redisClient = null;

const connectRedis = () => {
  try {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    redisClient.on('connect', () => {
      console.log('✓ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });

    redisClient.on('ready', () => {
      console.log('✓ Redis ready');
    });

    return redisClient;
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    console.log('⚠ Continuing without Redis (sessions will use memory)');
    return null;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = connectRedis();
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
