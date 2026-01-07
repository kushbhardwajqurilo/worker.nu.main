const mongoose = require("mongoose");

// ================== CUSTOM FIELD =================

// hoildays and sickness

const holidaySicknessSettingsSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: [true, "tenant Required"],
      unique: true,
      index: true,
    },
    holiday: {
      enabled: {
        type: Boolean,
        default: false, // Holiday submission for worker (toggle)
      },
      monthly_limit: {
        type: Number,
        min: 0,
        default: 0, // No. of holiday in a month
      },
    },

    sickness: {
      enabled: {
        type: Boolean,
        default: false, // Sickness submission for worker (toggle)
      },
      monthly_limit: {
        type: Number,
        min: 0,
        default: 0, // No. of sickness in a month
      },
    },
  },
  {
    timestamps: true,
  }
);

// ================== MODELS ==================

const HolidaySickness = mongoose.model(
  "leaves-setting",
  holidaySicknessSettingsSchema
);
module.exports = {
  HolidaySickness,
};
