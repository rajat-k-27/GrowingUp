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


  io.on('connection', (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", async ({ username, roomCode }) => {
      if (!roomCode) return;
      const targetRoom = roomCode.toString().trim().toUpperCase();

      // Leave old room if exists and different
      if (socket.roomCode && socket.roomCode !== targetRoom && socket.username) {
        socket.leave(socket.roomCode);
        await redis.srem(`room:${socket.roomCode}`, socket.username).catch(() => {});
        const users = await redis.smembers(`room:${socket.roomCode}`).catch(() => []);
        io.to(socket.roomCode).emit("roomUsers", users);
      }

      socket.username = username;
      socket.roomCode = targetRoom;
      socket.join(targetRoom);
      
      await redis.sadd(`room:${targetRoom}`, username).catch(() => {});
      const updatedUsers = await redis.smembers(`room:${targetRoom}`).catch(() => [username]);
      
      io.to(targetRoom).emit("roomUsers", updatedUsers);

      try {
        const { RoomData } = require('../models');
        // Use findOneAndUpdate with upsert so the room document is ALWAYS created/updated in MongoDB
        const room = await RoomData.findOneAndUpdate(
          { code: targetRoom },
          { 
            $addToSet: { members: username },
            $setOnInsert: { name: `ROOM ${targetRoom}`, createdBy: username }
          },
          { new: true, upsert: true }
        );
        
        if (room && room.members) {
          io.to(targetRoom).emit("roomMembers", room.members);
          socket.emit("roomMembers", room.members); // Immediate response to joining user
        }
        if (room && room.createdBy) {
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

    socket.on("getActivityHistory", async (roomCode) => {
      const room = roomCode ? roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        const cacheKey = `cache:activities:${room}`;
        const cached = await redis.get(cacheKey).catch(() => null);
        if (cached) return socket.emit("activityHistory", JSON.parse(cached));

        const history = await ActivityData.find({ roomCode: room }).sort({ createdAt: -1 }).limit(50).lean();
        await redis.set(cacheKey, JSON.stringify(history), 'EX', 60).catch(() => {});
        socket.emit("activityHistory", history);
      } catch(e) { console.error(e); }
    });

    socket.on("getChatHistory", async (roomCode) => {
      const room = roomCode ? roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        const cacheKey = `cache:chats:${room}`;
        const cached = await redis.get(cacheKey).catch(() => null);
        if (cached) return socket.emit("chatHistory", JSON.parse(cached));

        const history = await ChatMessage.find({ roomCode: room }).sort({ createdAt: 1 }).limit(100).lean();
        await redis.set(cacheKey, JSON.stringify(history), 'EX', 60).catch(() => {});
        socket.emit("chatHistory", history);
      } catch(e) { console.error(e); }
    });

    socket.on("getSecretHistory", async (data) => {
      const pin = typeof data === 'object' ? data.pin : data;
      const room = typeof data === 'object' && data.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        const history = await SecretData.find({ roomCode: room, pin }).sort({ createdAt: 1 }).lean();
        socket.emit("secretHistory", { pin, history });
      } catch(e) { console.error(e); }
    });

    socket.on("getAchievements", async (roomCode) => {
      const room = roomCode ? roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        const cacheKey = `cache:achievements:${room}`;
        const cached = await redis.get(cacheKey).catch(() => null);
        if (cached) return socket.emit("achievementsList", JSON.parse(cached));

        const history = await AchievementData.find({ roomCode: room }).sort({ createdAt: 1 }).lean();
        await redis.set(cacheKey, JSON.stringify(history), 'EX', 120).catch(() => {});
        socket.emit("achievementsList", history);
      } catch(e) { console.error(e); }
    });

    socket.on("getMemories", async (roomCode) => {
      const room = roomCode ? roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        const cacheKey = `cache:memories:${room}`;
        const cached = await redis.get(cacheKey).catch(() => null);
        if (cached) return socket.emit("memoriesList", JSON.parse(cached));

        const history = await MemoryData.find({ roomCode: room })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
        await redis.set(cacheKey, JSON.stringify(history), 'EX', 120).catch(() => {});
        socket.emit("memoriesList", history);
      } catch(e) { console.error(e); }
    });

    socket.on("leaveRoom", async () => {
      if (socket.roomCode && socket.username) {
        socket.leave(socket.roomCode);
        await redis.srem(`room:${socket.roomCode}`, socket.username).catch(() => {});
        const users = await redis.smembers(`room:${socket.roomCode}`).catch(() => []);
        io.to(socket.roomCode).emit("roomUsers", users);
        socket.roomCode = null;
      }
    });

    const logActivity = async (text, sender, type, mediaUrl = null, mediaType = null, roomCode = null) => {
      const room = roomCode ? roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return null;
      try {
        const act = await ActivityData.create({
          roomCode: room,
          sender,
          text,
          type,
          time: new Date().toLocaleTimeString(),
          mediaUrl,
          mediaType
        });
        
        // Invalidate activity cache!
        await redis.del(`cache:activities:${room}`).catch(() => {});
        return act;
      } catch(e) { console.error(e); return null; }
    };

    socket.on("setStatus", async (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      io.to(room).emit("statusUpdate", data);
      await logActivity(`Status changed: "${data.status}"`, data.identity, "status", null, null, room);
    });

    socket.on("sendDrop", async (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;

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
          if (base64Data && base64Data.length < 500000) {
            mediaUrl = base64Data;
            mediaType = base64Data.startsWith("data:video") || base64Data.startsWith("data:audio") ? "video" : "image";
          }
        }
      }

      const displayContent = data.content ? `: "${data.content}"` : "";
      const act = await logActivity(`Dropped a ${data.type.toLowerCase()}${displayContent}`, data.identity, "drop", mediaUrl, mediaType, room);
      
      io.to(room).emit("newDrop", { ...data, _id: act?._id, mediaUrl, mediaType, time: act?.time || new Date().toLocaleTimeString(), createdAt: act?.createdAt || new Date() });
    });

    socket.on("deleteDrop", async (data) => {
      const id = typeof data === 'object' ? data.id : data;
      const room = typeof data === 'object' && data.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
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
        if (room) {
          await redis.del(`cache:activities:${room}`).catch(() => {});
          io.to(room).emit("dropDeleted", id);
        }
      } catch (e) {
        console.error(e);
      }
    });

    socket.on("pingBro", async (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      io.to(room).emit("newPing", data);
      await logActivity(`Pinged: "${data.reason}"`, data.identity, "ping", null, null, room);
    });

    socket.on("imHere", async (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      io.to(room).emit("hereUpdate", data);
      await logActivity("I'm Here ❤️", data.identity, "here", null, null, room);
    });

    socket.on("chatMessage", async (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;

      // Apply Rate Limiting (Max 5 messages per 2 seconds)
      if (socket.user && !await checkRateLimit(socket.user.username, 'chat', 5, 2)) {
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
          if (base64Data && base64Data.length < 500000) {
            data.mediaUrl = base64Data;
            data.mediaType = base64Data.startsWith("data:video") || base64Data.startsWith("data:audio") ? "video" : "image";
          }
        }
      }

      data.createdAt = new Date();
      data.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      io.to(room).emit("newChatMessage", data);
      try {
        const { id, ...dbData } = data;
        await ChatMessage.create({ ...dbData, roomCode: room });
        
        // Invalidate chat cache!
        await redis.del(`cache:chats:${room}`).catch(() => {});
      } catch(e) { console.error(e); }
    });

    socket.on("secretMessage", async (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        const { id, ...dbData } = data;
        await SecretData.create({ ...dbData, roomCode: room });
      } catch(e) { console.error(e); }
      io.to(room).emit("newSecretMessage", data);
    });

    // DRAW EVENTS
    socket.on("draw_line", (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      socket.to(room).emit("draw_line", data);
      
      // Store vector line segment in Redis and cap to last 1000 lines to prevent memory bloat
      redis.rpush(`draw:${room}`, JSON.stringify(data)).catch(() => {});
      redis.ltrim(`draw:${room}`, -1000, -1).catch(() => {});
    });

    socket.on("draw_end", (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (room) {
        redis.expire(`draw:${room}`, 86400).catch(() => {});
      }
    });

    socket.on("get_draw_state", async (roomCode) => {
      const room = roomCode ? roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        const lines = await redis.lrange(`draw:${room}`, -1000, -1);
        if (lines && lines.length > 0) {
          const parsedLines = lines.map(l => {
            try { return JSON.parse(l); } catch(err) { return null; }
          }).filter(Boolean);
          socket.emit("draw_state", parsedLines);
        } else {
          socket.emit("draw_state", []);
        }
      } catch(e) {
        socket.emit("draw_state", []);
      }
    });

    socket.on("draw_clear", async (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      socket.to(room).emit("draw_clear", data);
      
      if (data && data.sender) {
        try {
          const lines = await redis.lrange(`draw:${room}`, 0, -1);
          const parsedLines = lines.map(l => {
            try { return JSON.parse(l); } catch(err) { return null; }
          }).filter(l => l && l.sender !== data.sender);
          await redis.del(`draw:${room}`);
          if (parsedLines.length > 0) {
            const stringified = parsedLines.map(l => JSON.stringify(l));
            for (let i = 0; i < stringified.length; i += 200) {
              await redis.rpush(`draw:${room}`, ...stringified.slice(i, i + 200));
            }
          }
        } catch(e) {
          console.error("Error in draw_clear:", e);
        }
      } else {
        redis.del(`draw:${room}`).catch(() => {});
      }
    });

    // SYNC EVENTS
    socket.on("sync_update", (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      socket.to(room).emit("sync_state", data);
      redis.set(`sync:${room}`, JSON.stringify(data), 'EX', 86400).catch(() => {});
    });

    socket.on("get_sync_state", async (roomCode) => {
      const room = roomCode ? roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        const stateStr = await redis.get(`sync:${room}`);
        if (stateStr) {
          socket.emit("sync_state", JSON.parse(stateStr));
        }
      } catch(e) {}
    });

    socket.on("unlockAchievement", async (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        await AchievementData.findOneAndUpdate(
          { id: data.id, roomCode: room }, 
          { unlocked: data.unlocked, unlockedBy: data.unlockedBy, roomCode: room },
          { upsert: true }
        );
        await redis.del(`cache:achievements:${room}`).catch(() => {});
      } catch(e) { console.error(e); }
      io.to(room).emit("newAchievement", data);
    });

    socket.on("createAchievement", async (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        await AchievementData.findOneAndUpdate(
          { id: data.id, roomCode: room },
          { ...data, roomCode: room },
          { upsert: true }
        );
        await redis.del(`cache:achievements:${room}`).catch(() => {});
      } catch(e) { console.error(e); }
      io.to(room).emit("newAchievementCreated", data);
    });

    socket.on("deleteAchievement", async (data) => {
      const id = typeof data === 'object' ? data.id : data;
      const room = typeof data === 'object' && data.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      try {
        await AchievementData.findOneAndDelete({ id: id, roomCode: room });
        if (room) await redis.del(`cache:achievements:${room}`).catch(() => {});
        io.to(room).emit("achievementDeleted", id);
      } catch(e) { console.error(e); }
    });

    socket.on("createMemory", async (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
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
        await MemoryData.create({ ...data, roomCode: room });
        await redis.del(`cache:memories:${room}`).catch(() => {});
      } catch(e) { console.error("Mongo Error:", e); }
      io.to(room).emit("newMemory", data);
    });

    socket.on("deleteMemory", async (data) => {
      const id = typeof data === 'object' ? data.id : data;
      const room = typeof data === 'object' && data.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      try {
        const mem = await MemoryData.findOne({ id: id, roomCode: room });
        if (mem && mem.image && mem.image.includes("cloudinary.com")) {
          const parts = mem.image.split("/");
          const filePart = parts[parts.length - 1];
          const folderPart = parts[parts.length - 2];
          const publicId = `${folderPart}/${filePart.split(".")[0]}`;
          cloudinary.uploader.destroy(publicId).catch(e => console.error("Cloudinary delete error:", e));
        }

        await MemoryData.findOneAndDelete({ id: id, roomCode: room });
        if (room) await redis.del(`cache:memories:${room}`).catch(() => {});
        io.to(room).emit("memoryDeleted", id);
      } catch (e) {
        console.error(e);
      }
    });

    socket.on("getLedgerHistory", async (roomCode) => {
      const room = roomCode ? roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        const history = await Expense.find({ roomCode: room }).sort({ createdAt: -1 }).lean();
        socket.emit("ledgerHistory", history);
      } catch (e) { console.error(e); }
    });

    socket.on("getRoomUsers", async (roomCode) => {
      const room = roomCode ? roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (room) {
        try {
          const users = await redis.smembers(`room:${room}`);
          socket.emit("roomUsers", users);
        } catch (e) {
          socket.emit("roomUsers", socket.username ? [socket.username] : []);
        }
      }
    });

    socket.on("getRoomMembers", async (roomCode) => {
      const room = roomCode ? roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (room) {
        try {
          const { RoomData } = require('../models');
          const roomDoc = await RoomData.findOne({ code: room }).lean();
          if (roomDoc && roomDoc.members) {
            socket.emit("roomMembers", roomDoc.members);
          }
        } catch (e) { console.error(e); }
      }
    });

    socket.on("createExpense", async (data) => {
      const room = data?.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      if (!room) return;
      try {
        const newExp = await Expense.create({ ...data, roomCode: room });
        io.to(room).emit("newExpense", newExp);
      } catch(e) { console.error(e); }
    });

    socket.on("deleteExpense", async (data) => {
      const id = typeof data === 'object' ? data.id : data;
      const room = typeof data === 'object' && data.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      try {
        await Expense.findByIdAndDelete(id);
        io.to(room || socket.roomCode).emit("expenseDeleted", id);
      } catch(e) { console.error(e); }
    });

    socket.on("editExpense", async ({ id, title, amount, roomCode }) => {
      const room = roomCode ? roomCode.toString().trim().toUpperCase() : socket.roomCode;
      try {
        const exp = await Expense.findByIdAndUpdate(id, { title, amount }, { new: true });
        io.to(room).emit("expenseUpdated", exp);
      } catch(e) { console.error(e); }
    });

    socket.on("settleExpense", async (data) => {
      const id = typeof data === 'object' ? data.id : data;
      const room = typeof data === 'object' && data.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      try {
        const exp = await Expense.findByIdAndUpdate(id, { settled: true }, { new: true });
        io.to(room).emit("expenseUpdated", exp);
        
        // Also emit ledgerHistory to update balances
        const history = await Expense.find({ roomCode: room }).sort({ createdAt: -1 }).lean();
        io.to(room).emit("ledgerHistory", history);
      } catch(e) { console.error(e); }
    });

    socket.on("markExpensePaid", async (data) => {
      const id = typeof data === 'object' ? data.id : data;
      const room = typeof data === 'object' && data.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      try {
        const exp = await Expense.findByIdAndUpdate(
          id, 
          { $addToSet: { markedPaidBy: socket.username } }, 
          { new: true }
        );
        io.to(room).emit("expenseUpdated", exp);
      } catch(e) { console.error(e); }
    });

    socket.on("settleDebts", async (data) => {
      const room = typeof data === 'object' && data.roomCode ? data.roomCode.toString().trim().toUpperCase() : socket.roomCode;
      try {
        await Expense.updateMany({ roomCode: room, paidBy: socket.username, settled: false }, { settled: true });
        const history = await Expense.find({ roomCode: room }).sort({ createdAt: -1 }).lean();
        io.to(room).emit("ledgerHistory", history);
      } catch(e) { console.error(e); }
    });

    socket.on("disconnect", async (reason) => {
      const room = socket.roomCode;
      const user = socket.username;
      console.log(`Client disconnected: ${socket.id} (user: ${user || 'anonymous'}, room: ${room || 'none'}, reason: ${reason})`);

      if (room && user) {
        // 3-second grace period: prevents active partners from flickering to INACTIVE
        // if the client is reconnecting or has multiple tabs open
        setTimeout(async () => {
          const roomSockets = io.sockets.adapter.rooms.get(room);
          let userStillInRoom = false;
          if (roomSockets) {
            for (const sockId of roomSockets) {
              const sock = io.sockets.sockets.get(sockId);
              if (sock && sock.username === user) {
                userStillInRoom = true;
                break;
              }
            }
          }

          if (!userStillInRoom) {
            try {
              await redis.srem(`room:${room}`, user);
              const users = await redis.smembers(`room:${room}`);
              io.to(room).emit("roomUsers", users);
            } catch (err) {
              console.error("Redis disconnect error:", err);
            }
          }
        }, 3000);
      }
    });
  });
};
