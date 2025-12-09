const mongoose = require("mongoose");
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    process.env.DB_URI.includes("localhost")
      ? console.log("Local Database connected")
      : console.log("cluster db conncted");
  } catch (error) {
    console.error("Failed to connect Databse", error);
    process.exit(1);
  }
};

module.exports = connectDB;
