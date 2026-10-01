const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const { UserData, RoomData, ChatMessage, ActivityData, AchievementData, SecretData, MemoryData } = require('../models');

// User Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await UserData.findOne({ username });
    if (user && user.password === password) {
      // 1. Session Management (Generate Token and store in Redis)
      const token = uuidv4();
      await redis.set(`session:${token}`, JSON.stringify(user), 'EX', 86400 * 7); // 7 day expiry
      res.json({ token, user });
    } else {
      res.status(401).json({ error: "Invalid username or password" });
    }
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

// User Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const exists = await UserData.findOne({ username });
    if (exists) return res.status(400).json({ error: "Username already taken" });
    
    const newUser = await UserData.create({ username, password, rooms: [] });
    
    // 1. Session Management
    const token = uuidv4();
    await redis.set(`session:${token}`, JSON.stringify(newUser), 'EX', 86400 * 7);
    res.json({ token, user: newUser });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

// Validate Session Token
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }
    const token = authHeader.split(" ")[1];
    
    const userDataStr = await redis.get(`session:${token}`);
    if (!userDataStr) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    
    res.json({ user: JSON.parse(userDataStr) });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get User Rooms
router.get('/users/:username/rooms', async (req, res) => {
  try {
    const user = await UserData.findOne({ username: req.params.username });
    if (user) {
      res.json(user.rooms);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Add/Create Room
router.post('/users/:username/rooms', async (req, res) => {
  try {
    const { roomCode, roomName } = req.body;
    const username = req.params.username;
    
    const user = await UserData.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    let room = await RoomData.findOne({ code: roomCode });
    if (!room) {
      room = await RoomData.create({ code: roomCode, name: roomName || "Unnamed Room", createdBy: username });
    }
    
    const exists = user.rooms.find(r => r.code === roomCode);
    if (!exists) {
      user.rooms.push({ code: roomCode, name: room.name });
      await user.save();
    }
    res.json(user.rooms);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get Activity History
router.get('/rooms/:roomCode/activities', async (req, res) => {
  try {
    const cacheKey = `cache:activities:${req.params.roomCode}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const history = await ActivityData.find({ roomCode: req.params.roomCode }).sort({ createdAt: -1 }).limit(50);
    await redis.set(cacheKey, JSON.stringify(history), 'EX', 60); // Cache for 60 seconds
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get Chat History
router.get('/rooms/:roomCode/chats', async (req, res) => {
  try {
    const cacheKey = `cache:chats:${req.params.roomCode}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const history = await ChatMessage.find({ roomCode: req.params.roomCode }).sort({ createdAt: 1 }).limit(100);
    await redis.set(cacheKey, JSON.stringify(history), 'EX', 60); // Cache for 60 seconds
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get Secret History
router.get('/rooms/:roomCode/secrets', async (req, res) => {
  try {
    const { pin } = req.query;
    if (!pin) return res.status(400).json({ error: "PIN required" });
    const history = await SecretData.find({ roomCode: req.params.roomCode, pin }).sort({ createdAt: 1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get Achievements
router.get('/rooms/:roomCode/achievements', async (req, res) => {
  try {
    const cacheKey = `cache:achievements:${req.params.roomCode}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const history = await AchievementData.find({ roomCode: req.params.roomCode }).sort({ createdAt: 1 });
    await redis.set(cacheKey, JSON.stringify(history), 'EX', 120); // Cache for 2 mins
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get Memories
router.get('/rooms/:roomCode/memories', async (req, res) => {
  try {
    const cacheKey = `cache:memories:${req.params.roomCode}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const history = await MemoryData.find({ roomCode: req.params.roomCode })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    await redis.set(cacheKey, JSON.stringify(history), 'EX', 120); // Cache for 2 mins
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
