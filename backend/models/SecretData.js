const mongoose = require("mongoose");

const secretSchema = new mongoose.Schema({
  roomCode: String,
  pin: String,
  sender: String,
  text: String,
  timestamp: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.SecretData || mongoose.model("SecretData", secretSchema);
