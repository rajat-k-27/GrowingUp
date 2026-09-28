import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  identity: { type: String, required: true, unique: true }, // 'RAJAT' or 'BRO'
  status: { type: String, default: "ONLINE" },
  lastActive: { type: Date, default: Date.now },
});

const dropSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  type: { type: String, enum: ["PHOTO", "THOUGHT", "VOICE", "MEME", "BRAINROT"], required: true },
  content: { type: String, required: true }, // Text, URL, etc.
  createdAt: { type: Date, default: Date.now },
  reactions: [{ type: String }],
});

const chatSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  unlockedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const secretSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const memorySchema = new mongoose.Schema({
  title: String,
  description: String,
  mediaUrl: String,
  date: { type: Date, default: Date.now },
  addedBy: { type: String },
});

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Drop = mongoose.models.Drop || mongoose.model("Drop", dropSchema);
export const Memory = mongoose.models.Memory || mongoose.model("Memory", memorySchema);
export const ChatMessage = mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatSchema);
export const Achievement = mongoose.models.Achievement || mongoose.model("Achievement", achievementSchema);
export const SecretMsg = mongoose.models.SecretMsg || mongoose.model("SecretMsg", secretSchema);
