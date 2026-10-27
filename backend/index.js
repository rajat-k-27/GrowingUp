require('dotenv').config({ path: './.env.local' });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const connectDB = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Middleware
const compression = require('compression');
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api', apiRoutes);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: '*',
  },
  maxHttpBufferSize: 5e6, // 5MB limit
  pingInterval: 15000, // Send heartbeat every 15s to keep Render/Cloudflare proxy alive
  pingTimeout: 10000 // 10s timeout for response
});

// Configure Redis Adapter for multi-instance scaling if explicitly requested
// On single-instance (Render default, WEB_CONCURRENCY=1), native in-memory adapter
// provides 0ms latency, zero Upstash bandwidth, and eliminates out-of-memory buffer leaks!
if (process.env.ENABLE_REDIS_ADAPTER === 'true') {
  try {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const pubClient = require('./config/redis');
    const subClient = pubClient.duplicate();

    subClient.on('error', (err) => {
      console.error('Redis subClient error:', err.message || err);
    });

    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.IO Redis adapter enabled for multi-instance scaling.');
  } catch (err) {
    console.error('Failed to initialize Redis adapter:', err);
  }
} else {
  console.log('Socket.IO running in high-performance native in-memory mode.');
}

socketHandler(io);

// Start Server AFTER connecting to DB
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Backend Microservice running on port ${PORT}`);
  });
});
