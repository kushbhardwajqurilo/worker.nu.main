const mongoose = require("mongoose");
const tokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "auth" },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 },
});
module.exports = mongoose.model("token", tokenSchema);
