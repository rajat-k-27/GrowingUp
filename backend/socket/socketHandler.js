const { ActivityData, ChatMessage, SecretData, AchievementData, MemoryData } = require('../models');
const cloudinary = require('../config/cloudinary');

module.exports = (io) => {
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
        
        if (room && room.members) {
          io.to(socket.roomCode).emit("roomMembers", room.members);
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
        const history = await ActivityData.find({ roomCode: socket.roomCode }).sort({ createdAt: -1 }).limit(50).lean();
        socket.emit("activityHistory", history);
      } catch(e) { console.error(e); }
    });

    socket.on("getChatHistory", async () => {
      try {
        const history = await ChatMessage.find({ roomCode: socket.roomCode }).sort({ createdAt: 1 }).limit(100).lean();
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
        const history = await AchievementData.find({ roomCode: socket.roomCode }).sort({ createdAt: 1 }).lean();
        socket.emit("achievementsList", history);
      } catch(e) { console.error(e); }
    });

    socket.on("getMemories", async () => {
      try {
        const history = await MemoryData.find({ roomCode: socket.roomCode })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
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
          data.mediaUrl = base64Data;
          data.mediaType = base64Data.startsWith("data:video") || base64Data.startsWith("data:audio") ? "video" : "image";
        }
      }

      io.to(socket.roomCode).emit("newChatMessage", data);
      try {
        const { id, ...dbData } = data;
        await ChatMessage.create({ ...dbData, roomCode: socket.roomCode });
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
    });

    socket.on("draw_clear", (data) => {
      socket.to(socket.roomCode).emit("draw_clear", data);
    });

    // SYNC EVENTS
    socket.on("sync_update", (data) => {
      // Store latest state in memory for late joiners
      roomSyncStates[socket.roomCode] = data;
      // Broadcast to everyone else
      socket.to(socket.roomCode).emit("sync_state", data);
    });

    socket.on("get_sync_state", () => {
      if (roomSyncStates[socket.roomCode]) {
        socket.emit("sync_state", roomSyncStates[socket.roomCode]);
      }
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
      } catch(e) { console.error("Mongo Error:", e); }
      io.to(socket.roomCode).emit("newMemory", data);
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
