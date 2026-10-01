const Redis = require('ioredis');

// Connects to local Redis server automatically (127.0.0.1:6379)
// In production, you would pass your cloud Redis URL here: new Redis(process.env.REDIS_URL)
const redis = new Redis();

redis.on('connect', () => {
  console.log('Redis connected successfully!');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = redis;
