const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  members: [{ type: String }]
});

module.exports = mongoose.models.RoomData || mongoose.model("RoomData", roomSchema);
