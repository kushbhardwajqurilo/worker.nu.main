const mongoose = require("mongoose");
const moment = require("moment");

const workerHoursSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "worker",
      required: true,
    },

    project: {
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: "project", required: true },
      project_date: { type: Date, required: true },
    },

    weekNumber: Number,

    status: {
      type: String,
      enum: ["pending", "review", "approved"],
      default: "pending",
    },

    day_off: { type: Boolean, default: false },

    start_working_hours: {
      hours: Number,
      minutes: Number,
    },

    finish_hours: {
      hours: Number,
      minutes: Number,
    },

    break_time: {
      type: Boolean,
      required: true,
    },

    total_hours: Number,

    comments: { type: String, required: true },
    image: { type: String, required: true },
  },
  { timestamps: true }
);

async function calculateFields(doc) {
  if (doc.project?.project_date)
    doc.weekNumber = moment(doc.project.project_date).isoWeek();

  const sh = doc.start_working_hours?.hours || 0;
  const sm = doc.start_working_hours?.minutes || 0;
  const fh = doc.finish_hours?.hours || 0;
  const fm = doc.finish_hours?.minutes || 0;

  const start = sh * 60 + sm;
  const end = fh * 60 + fm;

  let totalMinutes = end - start;

  const project = await mongoose.model("project").findById(doc.project.projectId).lean();
  const breakMin = project?.daily_work_hour?.break_time || 0;

  if (doc.break_time) totalMinutes -= breakMin;

  if (totalMinutes < 0) totalMinutes = 0;

  doc.total_hours = Number((totalMinutes / 60).toFixed(2));
}

workerHoursSchema.pre("save", async function () {
  await calculateFields(this);
});

workerHoursSchema.pre("findOneAndUpdate", async function () {
  let update = this.getUpdate();
  if (!update) return;

  update = update.$set || update;
  await calculateFields(update);

  this.setUpdate(update);
});

module.exports = mongoose.model("worker_hours", workerHoursSchema);
