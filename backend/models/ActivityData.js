const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  roomCode: { type: String, index: true },
  sender: String,
  text: String,
  type: String,
  time: String,
  mediaUrl: String,
  mediaType: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ActivityData || mongoose.model("ActivityData", activitySchema);
