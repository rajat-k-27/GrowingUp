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
  maxHttpBufferSize: 1e7, // 10MB
  pingInterval: 10000,
  pingTimeout: 60000 // 60s timeout for mobile hotspot/jitter resilience
});

// Configure Redis Adapter for horizontal scaling
const { createAdapter } = require('@socket.io/redis-adapter');
const pubClient = require('./config/redis');
const subClient = pubClient.duplicate();

subClient.on('error', (err) => {
  console.error('Redis subClient error:', err.message || err);
});

io.adapter(createAdapter(pubClient, subClient));

socketHandler(io);

// Start Server AFTER connecting to DB
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Backend Microservice running on port ${PORT}`);
  });
});
