const { ActivityData, ChatMessage, SecretData, AchievementData, MemoryData, Expense } = require('../models');
const cloudinary = require('../config/cloudinary');
const redis = require('../config/redis');

module.exports = (io) => {
  // 3. Rate Limiting & Anti-Spam Helper
  const checkRateLimit = async (userId, action, limit, window) => {
    const key = `ratelimit:${userId}:${action}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, window);
    return count <= limit;
  };

  // 1. Session Management (Socket Middleware)
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Missing session token"));
    
    const userStr = await redis.get(`session:${token}`);
    if (!userStr) return next(new Error("Invalid or expired session token"));
    
    socket.user = JSON.parse(userStr);
    next();
  });

  const rooms = {};
  const roomSyncStates = {};

  io.on('connection', (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", async ({ username, roomCode }) => {
      // Leave old room if exists
      if (socket.roomCode && socket.username && rooms[socket.roomCode]) {
        socket.leave(socket.roomCode);
        rooms[socket.roomCode].delete(socket.username);
        io.to(socket.roomCode).emit("roomUsers", Array.from(rooms[socket.roomCode]));
      }

      socket.username = username;
      socket.roomCode = roomCode || "DEFAULT";
      socket.join(socket.roomCode);
      
      if (!rooms[socket.roomCode]) rooms[socket.roomCode] = new Set();
      rooms[socket.roomCode].add(username);
      
      io.to(socket.roomCode).emit("roomUsers", Array.from(rooms[socket.roomCode]));

      try {
        const { RoomData } = require('../models');
        // Use findOneAndUpdate with $addToSet to prevent VersionError on concurrent saves
        const room = await RoomData.findOneAndUpdate(
          { code: socket.roomCode },
          { $addToSet: { members: username } },
          { new: true } // returns the updated document
        );
        
        if (room) {
          if (room.members) {
            io.to(socket.roomCode).emit("roomMembers", room.members);
          }
          socket.emit("roomInfo", { createdBy: room.createdBy });
        }
      } catch (e) { console.error("Error tracking room members", e); }
    });

    socket.on("login", async ({ username, password }) => {
      try {
        const { UserData } = require('../models');
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
        const { UserData } = require('../models');
        const exists = await UserData.findOne({ username });
        if (exists) return socket.emit("loginError", "Username already taken");
        
        const newUser = await UserData.create({ username, password, rooms: [] });
        socket.emit("loginSuccess", newUser);
      } catch(e) { socket.emit("loginError", "Database error"); }
    });

    socket.on("getUserRooms", async (username) => {
      try {
        const { UserData } = require('../models');
        const user = await UserData.findOne({ username });
        if (user) socket.emit("userRoomsList", user.rooms);
      } catch(e) { console.error(e); }
    });

    socket.on("addRoom", async ({ username, roomCode, roomName }) => {
      try {
        const { UserData, RoomData } = require('../models');
        const user = await UserData.findOne({ username });
        if (user) {
          let room = await RoomData.findOne({ code: roomCode });
          if (!room) {
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

    socket.on("getActivityHistory", async () => {
      try {
        const cacheKey = `cache:activities:${socket.roomCode}`;
        const cached = await redis.get(cacheKey);
        if (cached) return socket.emit("activityHistory", JSON.parse(cached));

        const history = await ActivityData.find({ roomCode: socket.roomCode }).sort({ createdAt: -1 }).limit(50).lean();
        await redis.set(cacheKey, JSON.stringify(history), 'EX', 60);
        socket.emit("activityHistory", history);
      } catch(e) { console.error(e); }
    });

    socket.on("getChatHistory", async () => {
      try {
        const cacheKey = `cache:chats:${socket.roomCode}`;
        const cached = await redis.get(cacheKey);
        if (cached) return socket.emit("chatHistory", JSON.parse(cached));

        const history = await ChatMessage.find({ roomCode: socket.roomCode }).sort({ createdAt: 1 }).limit(100).lean();
        await redis.set(cacheKey, JSON.stringify(history), 'EX', 60);
        socket.emit("chatHistory", history);
      } catch(e) { console.error(e); }
    });

    socket.on("getSecretHistory", async (pin) => {
      try {
        const history = await SecretData.find({ roomCode: socket.roomCode, pin }).sort({ createdAt: 1 }).lean();
        socket.emit("secretHistory", { pin, history });
      } catch(e) { console.error(e); }
    });

    socket.on("getAchievements", async () => {
      try {
        const cacheKey = `cache:achievements:${socket.roomCode}`;
        const cached = await redis.get(cacheKey);
        if (cached) return socket.emit("achievementsList", JSON.parse(cached));

        const history = await AchievementData.find({ roomCode: socket.roomCode }).sort({ createdAt: 1 }).lean();
        await redis.set(cacheKey, JSON.stringify(history), 'EX', 120);
        socket.emit("achievementsList", history);
      } catch(e) { console.error(e); }
    });

    socket.on("getMemories", async () => {
      try {
        const cacheKey = `cache:memories:${socket.roomCode}`;
        const cached = await redis.get(cacheKey);
        if (cached) return socket.emit("memoriesList", JSON.parse(cached));

        const history = await MemoryData.find({ roomCode: socket.roomCode })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
        await redis.set(cacheKey, JSON.stringify(history), 'EX', 120);
        socket.emit("memoriesList", history);
      } catch(e) { console.error(e); }
    });

    socket.on("leaveRoom", () => {
      if (socket.roomCode && socket.username && rooms[socket.roomCode]) {
        socket.leave(socket.roomCode);
        rooms[socket.roomCode].delete(socket.username);
        io.to(socket.roomCode).emit("roomUsers", Array.from(rooms[socket.roomCode]));
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
        
        // Invalidate activity cache!
        await redis.del(`cache:activities:${socket.roomCode}`);
        return act;
      } catch(e) { console.error(e); return null; }
    };

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
          mediaUrl = base64Data;
          mediaType = base64Data.startsWith("data:video") || base64Data.startsWith("data:audio") ? "video" : "image";
        }
      }

      const displayContent = data.content ? `: "${data.content}"` : "";
      const act = await logActivity(`Dropped a ${data.type.toLowerCase()}${displayContent}`, data.identity, "drop", mediaUrl, mediaType);
      
      io.to(socket.roomCode).emit("newDrop", { ...data, _id: act?._id, mediaUrl, mediaType, time: act?.time || new Date().toLocaleTimeString(), createdAt: act?.createdAt || new Date() });
    });

    socket.on("deleteDrop", async (id) => {
      try {
        const act = await ActivityData.findById(id);
        if (act && act.mediaUrl && act.mediaUrl.includes("cloudinary.com")) {
          const parts = act.mediaUrl.split("/");
          const filePart = parts[parts.length - 1];
          const folderPart = parts[parts.length - 2];
          const publicId = `${folderPart}/${filePart.split(".")[0]}`;
          cloudinary.uploader.destroy(publicId).catch(e => console.error("Cloudinary delete error:", e));
        }

        await ActivityData.findByIdAndDelete(id);
        await redis.del(`cache:activities:${socket.roomCode}`);
        io.to(socket.roomCode).emit("dropDeleted", id);
      } catch (e) {
        console.error(e);
      }
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
      // Apply Rate Limiting (Max 5 messages per 2 seconds)
      if (!await checkRateLimit(socket.user.username, 'chat', 5, 2)) {
        console.warn(`Rate limit triggered for ${socket.user.username} on chatMessage`);
        return; // Silently drop the spam message
      }

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
          data.mediaUrl = base64Data;
          data.mediaType = base64Data.startsWith("data:video") || base64Data.startsWith("data:audio") ? "video" : "image";
        }
      }

      data.createdAt = new Date();
      data.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      io.to(socket.roomCode).emit("newChatMessage", data);
      try {
        const { id, ...dbData } = data;
        await ChatMessage.create({ ...dbData, roomCode: socket.roomCode });
        
        // Invalidate chat cache!
        await redis.del(`cache:chats:${socket.roomCode}`);
      } catch(e) { console.error(e); }
    });

    socket.on("secretMessage", async (data) => {
      try {
        const { id, ...dbData } = data;
        await SecretData.create({ ...dbData, roomCode: socket.roomCode });
      } catch(e) { console.error(e); }
      io.to(socket.roomCode).emit("newSecretMessage", data);
    });

    // DRAW EVENTS
    socket.on("draw_line", (data) => {
      socket.to(socket.roomCode).emit("draw_line", data);
      
      // Fire-and-forget Redis storage
      redis.rpush(`draw:${socket.roomCode}`, JSON.stringify(data))
        .then(() => redis.expire(`draw:${socket.roomCode}`, 86400))
        .catch(() => {});
    });

    socket.on("get_draw_state", async () => {
      try {
        const lines = await redis.lrange(`draw:${socket.roomCode}`, 0, -1);
        if (lines && lines.length > 0) {
          const parsedLines = lines.map(l => JSON.parse(l));
          socket.emit("draw_state", parsedLines);
        }
      } catch(e) {}
    });

    socket.on("draw_clear", (data) => {
      socket.to(socket.roomCode).emit("draw_clear", data);
      
      // Fire-and-forget Redis storage
      if (data && data.sender) {
        redis.lrange(`draw:${socket.roomCode}`, 0, -1).then(lines => {
          const parsedLines = lines.map(l => JSON.parse(l)).filter(l => l.sender !== data.sender);
          redis.del(`draw:${socket.roomCode}`).then(() => {
            if (parsedLines.length > 0) {
              const stringified = parsedLines.map(l => JSON.stringify(l));
              redis.rpush(`draw:${socket.roomCode}`, ...stringified);
            }
          });
        }).catch(() => {});
      } else {
        redis.del(`draw:${socket.roomCode}`).catch(() => {});
      }
    });

    // SYNC EVENTS
    socket.on("sync_update", (data) => {
      // Emit instantly for zero latency
      socket.to(socket.roomCode).emit("sync_state", data);
      // Save to Redis in background
      redis.set(`sync:${socket.roomCode}`, JSON.stringify(data), 'EX', 86400).catch(e => console.error(e));
    });

    socket.on("get_sync_state", async () => {
      try {
        const stateStr = await redis.get(`sync:${socket.roomCode}`);
        if (stateStr) {
          socket.emit("sync_state", JSON.parse(stateStr));
        }
      } catch(e) {}
    });

    socket.on("unlockAchievement", async (data) => {
      try {
        await AchievementData.findOneAndUpdate(
          { id: data.id, roomCode: socket.roomCode }, 
          { unlocked: data.unlocked, unlockedBy: data.unlockedBy, roomCode: socket.roomCode },
          { upsert: true }
        );
        await redis.del(`cache:achievements:${socket.roomCode}`);
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
        await redis.del(`cache:achievements:${socket.roomCode}`);
      } catch(e) { console.error(e); }
      io.to(socket.roomCode).emit("newAchievementCreated", data);
    });

    socket.on("deleteAchievement", async (id) => {
      try {
        await AchievementData.findOneAndDelete({ id: id, roomCode: socket.roomCode });
        await redis.del(`cache:achievements:${socket.roomCode}`);
      } catch(e) { console.error(e); }
      io.to(socket.roomCode).emit("achievementDeleted", id);
    });

    socket.on("createMemory", async (data) => {
      try {
        if (data.image && data.image.startsWith("data:image")) {
          try {
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
          }
        }
        await MemoryData.create({ ...data, roomCode: socket.roomCode });
        await redis.del(`cache:memories:${socket.roomCode}`);
      } catch(e) { console.error("Mongo Error:", e); }
      io.to(socket.roomCode).emit("newMemory", data);
    });

    socket.on("deleteMemory", async (id) => {
      try {
        const mem = await MemoryData.findOne({ id: id, roomCode: socket.roomCode });
        if (mem && mem.image && mem.image.includes("cloudinary.com")) {
          const parts = mem.image.split("/");
          const filePart = parts[parts.length - 1];
          const folderPart = parts[parts.length - 2];
          const publicId = `${folderPart}/${filePart.split(".")[0]}`;
          cloudinary.uploader.destroy(publicId).catch(e => console.error("Cloudinary delete error:", e));
        }

        await MemoryData.findOneAndDelete({ id: id, roomCode: socket.roomCode });
        await redis.del(`cache:memories:${socket.roomCode}`);
        io.to(socket.roomCode).emit("memoryDeleted", id);
      } catch (e) {
        console.error(e);
      }
    });
    socket.on("getLedgerHistory", async () => {
      try {
        const history = await Expense.find({ roomCode: socket.roomCode }).sort({ createdAt: -1 }).lean();
        socket.emit("ledgerHistory", history);
      } catch (e) { console.error(e); }
    });

    socket.on("getRoomUsers", () => {
      if (rooms[socket.roomCode]) {
        socket.emit("roomUsers", Array.from(rooms[socket.roomCode]));
      }
    });

    socket.on("getRoomMembers", async () => {
      try {
        const { RoomData } = require('../models');
        const room = await RoomData.findOne({ code: socket.roomCode }).lean();
        if (room && room.members) {
          socket.emit("roomMembers", room.members);
        }
      } catch (e) { console.error(e); }
    });

    socket.on("createExpense", async (data) => {
      try {
        const newExp = await Expense.create({ ...data, roomCode: socket.roomCode });
        io.to(socket.roomCode).emit("newExpense", newExp);
      } catch(e) { console.error(e); }
    });

    socket.on("deleteExpense", async (id) => {
      try {
        await Expense.findByIdAndDelete(id);
        io.to(socket.roomCode).emit("expenseDeleted", id);
      } catch(e) { console.error(e); }
    });

    socket.on("editExpense", async ({ id, title, amount }) => {
      try {
        const exp = await Expense.findByIdAndUpdate(id, { title, amount }, { new: true });
        io.to(socket.roomCode).emit("expenseUpdated", exp);
      } catch(e) { console.error(e); }
    });

    socket.on("settleExpense", async (id) => {
      try {
        const exp = await Expense.findByIdAndUpdate(id, { settled: true }, { new: true });
        io.to(socket.roomCode).emit("expenseUpdated", exp);
        
        // Also emit ledgerHistory to update balances
        const history = await Expense.find({ roomCode: socket.roomCode }).sort({ createdAt: -1 }).lean();
        io.to(socket.roomCode).emit("ledgerHistory", history);
      } catch(e) { console.error(e); }
    });

    socket.on("markExpensePaid", async (id) => {
      try {
        const exp = await Expense.findByIdAndUpdate(
          id, 
          { $addToSet: { markedPaidBy: socket.username } }, 
          { new: true }
        );
        io.to(socket.roomCode).emit("expenseUpdated", exp);
      } catch(e) { console.error(e); }
    });

    socket.on("settleDebts", async () => {
      try {
        await Expense.updateMany({ roomCode: socket.roomCode, paidBy: socket.username, settled: false }, { settled: true });
        const history = await Expense.find({ roomCode: socket.roomCode }).sort({ createdAt: -1 }).lean();
        io.to(socket.roomCode).emit("ledgerHistory", history);
      } catch(e) { console.error(e); }
    });


    socket.on("disconnect", () => {
      if (socket.roomCode && socket.username) {
        if (rooms[socket.roomCode]) {
          rooms[socket.roomCode].delete(socket.username);
          io.to(socket.roomCode).emit("roomUsers", Array.from(rooms[socket.roomCode]));
        }
      }
      console.log("Client disconnected:", socket.id);
    });
  });
};
