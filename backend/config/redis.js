const Redis = require('ioredis');

const redisOptions = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  keepAlive: 10000,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  }
};

// Connects to Cloud Redis if REDIS_URL exists, otherwise defaults to local
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', redisOptions);

redis.on('connect', () => {
  console.log('Redis connected successfully!');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message || err);
});

module.exports = redis;
