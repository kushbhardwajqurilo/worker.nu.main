const mongoose = require("mongoose");
const adminSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    unique: true,
    required: [true, "tenantId required"],
  },
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
    required: [true, "company people required"],
  },
  language: {
    type: String,
    enum: {
      values: ["english", "lithuanian", "dutch", "german", "polish", "russian"],
      message: "Language must be either English or Lithuanian",
    },
  },
  phone: { type: String, required: [true, "phone number required"] },
  timezone: { type: String, default: "" },
  company_registration_no: { type: String, default: "" },
  company_address: { type: String, default: "" },
  logo: { type: String, default: "" },

  role: {
    type: String,
    required: [true],
  },
});
// const generateTenantId =
adminSchema.index({ email: 1, tenantId: 1 });
module.exports = mongoose.model("auth", adminSchema);
