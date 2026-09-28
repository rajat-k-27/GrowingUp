const { createServer } = require("node:http");
const next = require("next");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Define Mongoose Models (re-using them globally)
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: { type: String },
  rooms: [{
    code: String,
    name: String,
    joinedAt: { type: Date, default: Date.now }
  }]
});

const roomSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  roomCode: String,
  sender: String,
  text: String,
  mediaUrl: String,
  mediaType: String,
  createdAt: { type: Date, default: Date.now }
});

const activitySchema = new mongoose.Schema({
  roomCode: String,
  sender: String,
  text: String,
  type: String,
  time: String,
  mediaUrl: String,
  mediaType: String,
  createdAt: { type: Date, default: Date.now }
});

const achievementSchema = new mongoose.Schema({
  roomCode: String,
  id: String,
  title: String,
  desc: String,
  unlocked: { type: Boolean, default: false },
  unlockedBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const secretSchema = new mongoose.Schema({
  roomCode: String,
  pin: String,
  sender: String,
  text: String,
  timestamp: String,
  createdAt: { type: Date, default: Date.now }
});

const memorySchema = new mongoose.Schema({
  roomCode: String,
  id: String,
  author: String,
  description: String,
  image: String, // base64
  date: String,
  time: String,
  createdAt: { type: Date, default: Date.now }
});

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const UserData = mongoose.models.UserData || mongoose.model("UserData", userSchema);
const RoomData = mongoose.models.RoomData || mongoose.model("RoomData", roomSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatSchema);
const ActivityData = mongoose.models.ActivityData || mongoose.model("ActivityData", activitySchema);
const AchievementData = mongoose.models.AchievementData || mongoose.model("AchievementData", achievementSchema);
const SecretData = mongoose.models.SecretData || mongoose.model("SecretData", secretSchema);
const MemoryData = mongoose.models.MemoryData || mongoose.model("MemoryData", memorySchema);

app.prepare().then(async () => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
    maxHttpBufferSize: 1e7, // 10MB to allow image uploads via socket
  });

  const connectedUsers = new Set();
  
  // Track rooms in memory
  if (!global.rooms) global.rooms = {};

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("login", async ({ username, password }) => {
      try {
        const user = await UserData.findOne({ username });
        if (user && user.password === password) {
          socket.emit("loginSuccess", user);
        } else {
          socket.emit("loginError", "Invalid username or password");
        }
      } catch(e) { socket.emit("loginError", "Database error"); }
    });

    socket.on("register", async ({ username, password }) => {
      try {
        const exists = await UserData.findOne({ username });
        if (exists) return socket.emit("loginError", "Username already taken");
        
        const newUser = await UserData.create({ username, password, rooms: [] });
        socket.emit("loginSuccess", newUser);
      } catch(e) { socket.emit("loginError", "Database error"); }
    });

    socket.on("getUserRooms", async (username) => {
      try {
        const user = await UserData.findOne({ username });
        if (user) socket.emit("userRoomsList", user.rooms);
      } catch(e) { console.error(e); }
    });

    socket.on("addRoom", async ({ username, roomCode, roomName }) => {
      try {
        const user = await UserData.findOne({ username });
        if (user) {
          let room = await RoomData.findOne({ code: roomCode });
          
          if (!room) {
            // User is creating a new room
            room = await RoomData.create({ code: roomCode, name: roomName || "Unnamed Room", createdBy: username });
          }
          
          const exists = user.rooms.find(r => r.code === roomCode);
          if (!exists) {
            user.rooms.push({ code: roomCode, name: room.name });
            await user.save();
          }
          socket.emit("userRoomsList", user.rooms);
        }
      } catch(e) { console.error(e); }
    });

    socket.on("joinRoom", ({ username, roomCode }) => {
      // Leave old room if exists
      if (socket.roomCode && socket.username && global.rooms[socket.roomCode]) {
        socket.leave(socket.roomCode);
        global.rooms[socket.roomCode].delete(socket.username);
        io.to(socket.roomCode).emit("roomUsers", Array.from(global.rooms[socket.roomCode]));
      }

      socket.username = username;
      socket.roomCode = roomCode || "DEFAULT";
      socket.join(socket.roomCode);
      
      if (!global.rooms[socket.roomCode]) global.rooms[socket.roomCode] = new Set();
      global.rooms[socket.roomCode].add(username);
      
      io.to(socket.roomCode).emit("roomUsers", Array.from(global.rooms[socket.roomCode]));
    });

    socket.on("leaveRoom", () => {
      if (socket.roomCode && socket.username && global.rooms[socket.roomCode]) {
        socket.leave(socket.roomCode);
        global.rooms[socket.roomCode].delete(socket.username);
        io.to(socket.roomCode).emit("roomUsers", Array.from(global.rooms[socket.roomCode]));
        socket.roomCode = null;
      }
    });

    const logActivity = async (text, sender, type, mediaUrl = null, mediaType = null) => {
      if (!socket.roomCode) return null;
      try {
        const act = await ActivityData.create({
          roomCode: socket.roomCode,
          sender,
          text,
          type,
          time: new Date().toLocaleTimeString(),
          mediaUrl,
          mediaType
        });
        return act;
      } catch(e) { console.error(e); return null; }
    };

    socket.on("getActivityHistory", async () => {
      try {
        const history = await ActivityData.find({ roomCode: socket.roomCode }).sort({ createdAt: -1 }).limit(50);
        socket.emit("activityHistory", history);
      } catch(e) { console.error(e); }
    });

    socket.on("setStatus", async (data) => {
      io.to(socket.roomCode).emit("statusUpdate", data);
      await logActivity(`Status changed: "${data.status}"`, data.identity, "status");
    });

    socket.on("sendDrop", async (data) => {
      let mediaUrl = null;
      let mediaType = null;
      
      const base64Data = data.mediaBase64;
      delete data.mediaBase64;

      if (base64Data) {
        try {
          const uploadRes = await cloudinary.uploader.upload(base64Data, {
            folder: "bro_exe",
            resource_type: "auto",
            timeout: 120000,
            quality: "auto:eco", 
            fetch_format: "auto"
          });
          mediaUrl = uploadRes.secure_url;
          mediaType = uploadRes.resource_type;
        } catch(e) {
          console.error("Cloudinary upload failed for drop:", e);
          // FALLBACK: Use the compressed base64 string directly!
          mediaUrl = base64Data;
          mediaType = base64Data.startsWith("data:video") || base64Data.startsWith("data:audio") ? "video" : "image";
        }
      }

      const displayContent = data.content ? `: "${data.content}"` : "";
      const act = await logActivity(`Dropped a ${data.type.toLowerCase()}${displayContent}`, data.identity, "drop", mediaUrl, mediaType);
      
      io.to(socket.roomCode).emit("newDrop", { ...data, activityId: act?._id, mediaUrl, mediaType, time: act?.time || new Date().toLocaleTimeString() });
    });

    socket.on("pingBro", async (data) => {
      io.to(socket.roomCode).emit("newPing", data);
      await logActivity(`Pinged: "${data.reason}"`, data.identity, "ping");
    });

    socket.on("imHere", async (data) => {
      io.to(socket.roomCode).emit("hereUpdate", data);
      await logActivity("I'm Here ❤️", data.identity, "here");
    });

    socket.on("chatMessage", async (data) => {
      let mediaUrl = null;
      let mediaType = null;
      
      const base64Data = data.mediaBase64;
      delete data.mediaBase64;

      if (base64Data) {
        try {
          const uploadRes = await cloudinary.uploader.upload(base64Data, {
            folder: "bro_exe",
            resource_type: "auto",
            timeout: 120000,
            quality: "auto:eco",
            fetch_format: "auto"
          });
          mediaUrl = uploadRes.secure_url;
          mediaType = uploadRes.resource_type;
          
          data.mediaUrl = mediaUrl;
          data.mediaType = mediaType;
        } catch(e) {
          console.error("Cloudinary upload failed for chat:", e);
          // FALLBACK: Use compressed base64 directly
          data.mediaUrl = base64Data;
          data.mediaType = base64Data.startsWith("data:video") || base64Data.startsWith("data:audio") ? "video" : "image";
        }
      }

      io.to(socket.roomCode).emit("newChatMessage", data);
      try {
        await ChatMessage.create({ ...data, roomCode: socket.roomCode });
      } catch(e) { console.error(e); }
    });

    socket.on("getChatHistory", async () => {
      try {
        const history = await ChatMessage.find({ roomCode: socket.roomCode }).sort({ createdAt: 1 }).limit(100);
        socket.emit("chatHistory", history);
      } catch(e) { console.error(e); }
    });

    socket.on("secretMessage", async (data) => {
      try {
        await SecretData.create({ ...data, roomCode: socket.roomCode });
      } catch(e) { console.error(e); }
      io.to(socket.roomCode).emit("newSecretMessage", data);
    });

    socket.on("getSecretHistory", async (pin) => {
      try {
        const history = await SecretData.find({ roomCode: socket.roomCode, pin }).sort({ createdAt: 1 });
        socket.emit("secretHistory", { pin, history });
      } catch(e) { console.error(e); }
    });

    socket.on("getAchievements", async () => {
      try {
        const history = await AchievementData.find({ roomCode: socket.roomCode }).sort({ createdAt: 1 });
        socket.emit("achievementsList", history);
      } catch(e) { console.error(e); }
    });

    socket.on("unlockAchievement", async (data) => {
      try {
        await AchievementData.findOneAndUpdate(
          { id: data.id, roomCode: socket.roomCode }, 
          { unlocked: data.unlocked, unlockedBy: data.unlockedBy, roomCode: socket.roomCode },
          { upsert: true }
        );
      } catch(e) { console.error(e); }
      io.to(socket.roomCode).emit("newAchievement", data);
    });

    socket.on("createAchievement", async (data) => {
      try {
        await AchievementData.findOneAndUpdate(
          { id: data.id, roomCode: socket.roomCode },
          { ...data, roomCode: socket.roomCode },
          { upsert: true }
        );
      } catch(e) { console.error(e); }
      io.to(socket.roomCode).emit("newAchievementCreated", data);
    });

    socket.on("deleteAchievement", async (id) => {
      try {
        await AchievementData.findOneAndDelete({ id: id, roomCode: socket.roomCode });
      } catch(e) { console.error(e); }
      io.to(socket.roomCode).emit("achievementDeleted", id);
    });

    socket.on("createMemory", async (data) => {
      try {
        if (data.image && data.image.startsWith("data:image")) {
          try {
            // Added timeout: 60000 to prevent 499 errors
            // Added quality: "auto" and fetch_format: "auto" to compress the image heavily
            // Added width: 1200, crop: "limit" to ensure the image isn't massive, making it load WAY faster
            const uploadRes = await cloudinary.uploader.upload(data.image, { 
              folder: "bro_exe",
              timeout: 60000,
              quality: "auto:good",
              fetch_format: "auto",
              width: 1200,
              crop: "limit"
            });
            data.image = uploadRes.secure_url;
          } catch(cloudErr) {
            console.error("Cloudinary Error:", cloudErr);
            // If cloudinary fails, keep the base64 string so the memory isn't lost
          }
        }
        await MemoryData.create({ ...data, roomCode: socket.roomCode });
      } catch(e) { console.error("Mongo Error:", e); }
      io.to(socket.roomCode).emit("newMemory", data);
    });

    socket.on("getMemories", async () => {
      try {
        const history = await MemoryData.find({ roomCode: socket.roomCode })
          .sort({ createdAt: -1 })
          .limit(50) // Only load last 50 memories for speed
          .lean();   // Plain JSON instead of heavy Mongoose documents
        socket.emit("memoriesList", history);
      } catch(e) { console.error(e); }
    });

    socket.on("disconnect", () => {
      if (socket.roomCode && socket.username) {
        if (global.rooms[socket.roomCode]) {
          global.rooms[socket.roomCode].delete(socket.username);
          io.to(socket.roomCode).emit("roomUsers", Array.from(global.rooms[socket.roomCode]));
        }
      }
      console.log("Client disconnected:", socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      if (process.env.MONGODB_URI) {
        mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 30000,
          bufferTimeoutMS: 30000
        }).then(async () => {
          console.log("MongoDB connected!");
          try {
            // Drop the old unique index on id for achievementdatas so duplicate rooms don't crash
            await mongoose.connection.db.collection('achievementdatas').dropIndex('id_1');
            console.log("Dropped legacy achievement id index.");
          } catch (e) { }
          try {
            // Drop old unique index for memorydatas too
            await mongoose.connection.db.collection('memorydatas').dropIndex('id_1');
            console.log("Dropped legacy memory id index.");
          } catch (e) { }
        }).catch(console.error);
      }
    });
});
