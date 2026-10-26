const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema({
  roomCode: { type: String, index: true },
  id: String,
  author: String,
  description: String,
  image: String, // base64
  date: String,
  time: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.MemoryData || mongoose.model("MemoryData", memorySchema);
