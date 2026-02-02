const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: [true, "tenant-id required"],
    ref: "auth",
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "worker id required"],
    ref: "worker",
  },

  requestedDate: {
    type: Date,
    default: Date.now,
  },
  duration: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
    },
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["approved", "rejected", "pending"],
    default: "pending",
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  isDelete: {
    type: Boolean,
    default: false,
  },
});
const sicknessSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: [true, "tenant-id required"],
    ref: "auth",
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "worker id required"],
    ref: "worker",
  },

  requestedDate: {
    type: Date,
    default: Date.now,
  },
  duration: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
    },
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["approved", "rejected", "pending"],
    default: "pending",
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  isDelete: {
    type: Boolean,
    default: false,
  },
});
holidaySchema.index({ tenantId: 1 });
sicknessSchema.index({ tenantId: 1 });
const holidayModel = mongoose.model("holiday_leaves", holidaySchema);
const sicknessModel = mongoose.model("sickness_leaves", sicknessSchema);
module.exports = { holidayModel, sicknessModel };
