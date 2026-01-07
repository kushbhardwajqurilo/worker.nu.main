const mongoose = require("mongoose");

const WorkerCounterSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

//  ONE counter per tenant per key
WorkerCounterSchema.index({ tenantId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("worker_counter", WorkerCounterSchema);
