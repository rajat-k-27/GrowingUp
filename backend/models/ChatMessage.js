const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  roomCode: String,
  sender: String,
  text: String,
  mediaUrl: String,
  mediaType: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatSchema);
