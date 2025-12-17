const Counter = require("../models/counterModel");

const generateId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: "projectId" },
    { $inc: { seq: 1 } }, // ✅ FIX HERE
    {
      new: true,
      upsert: true,
    }
  );

  return counter.seq.toString().padStart(2, "0");
};

module.exports = generateId;
