const mongoose = require("mongoose");

const holidaySicknessSettingsSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: [true, "Tenant id is required"],
      index: true,
      unique: true,
    },

    holiday: {
      monthly_limit: {
        type: Number,
        min: [0, "Holiday limit cannot be negative"],
        default: 0,
        validate: {
          validator: Number.isInteger,
          message: "Holiday monthly limit must be an integer",
        },
      },
    },

    sickness: {
      monthly_limit: {
        type: Number,
        min: [0, "Sickness limit cannot be negative"],
        default: 0,
        validate: {
          validator: Number.isInteger,
          message: "Sickness monthly limit must be an integer",
        },
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

holidaySicknessSettingsSchema.index({ tenantId: 1 }, { unique: true });

const HolidaySickness = mongoose.model(
  "holiday_sickness_settings",
  holidaySicknessSettingsSchema
);

module.exports = { HolidaySickness };
