const mongoose = require("mongoose");

const workerHoursSchema = new mongoose.Schema(
  {
    workerId: {
      type: String,
      required: [true, "worker idetification missing"],
    },
    project: {
      projectId: {
        type: String,
        ref: "project",
        required: [true, "please select project"],
      },
      project_date: {
        type: Date,
        required: [true, "please select project date"],
      },
    },

    day_off: {
      type: Boolean,
      default: false,
      required: true,
    },

    start_working_hours: {
      hours: { type: Number },
      minutes: { type: Number },
    },

    finish_hours: {
      hours: { type: Number },
      minutes: { type: Number },
    },

    break_time: {
      minutes: { type: Number, default: 0 },
    },

    comments: {
      type: String,
      required: [true, "comments required"],
    },

    image: {
      type: String,
      required: [true, "image required"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("worker_hours", workerHoursSchema);
