const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: { type: String },
  rooms: [{
    code: String,
    name: String,
    joinedAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.models.UserData || mongoose.model("UserData", userSchema);
