const Redis = require('ioredis');

// Connects to Cloud Redis if REDIS_URL exists, otherwise defaults to local
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

redis.on('connect', () => {
  console.log('Redis connected successfully!');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = redis;
