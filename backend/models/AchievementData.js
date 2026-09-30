const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema({
  roomCode: String,
  id: String,
  title: String,
  desc: String,
  unlocked: { type: Boolean, default: false },
  unlockedBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.AchievementData || mongoose.model("AchievementData", achievementSchema);
