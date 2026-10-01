const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  roomCode: String,
  title: String,
  amount: Number,
  paidBy: String,
  splitWith: { type: [String], default: [] }, // Array of user identities who owe this
  settled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Expense || mongoose.model("Expense", expenseSchema);
