const mongoose = require("mongoose");
const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "admin name required"],
  },
  email: {
    type: String,
    unique: [true, "Email already Exist"],
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (val) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      },
      message: (props) => `${props.value} is not a valid email!`,
    },
  },
  password: {
    type: String,
    required: true,
    trim: true,
    minlength: [4, "Password must be at least 4 charactors"],
  },
  company_name: { type: String, required: [true, "company name required"] },
  company_people: {
    type: String,
    required: [true, "compant people required"],
  },
  language: {
    type: String,
    enum: {
      values: ["English", "Lithuanian"],
      message: "Language must be either English or Lithuanian",
    },
  },
  phone: { type: String, required: [true, "phone number required"] },
});

module.exports = mongoose.model("auth", adminSchema);
