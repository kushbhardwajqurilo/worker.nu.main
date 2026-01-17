const mongoose = require("mongoose");

const workerHoursSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      ref: "auth",
      required: [true, "tenant required"],
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "worker",
    },

    project: {
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "project",
        required: true,
      },
      project_date: {
        type: Date,
        required: true,
      },
    },

    weekNumber: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "review", "approved"],
      default: "pending",
    },

    day_off: { type: Boolean, default: false },

    start_working_hours: {
      hours: Number, // 0–23
      minutes: Number, // 0–59
    },

    finish_hours: {
      hours: Number, // 0–23
      minutes: Number, // 0–59
    },

    break_time: {
      type: String,
    },

    total_hours: {
      type: Number,
      default: 0,
    },

    comments: { type: String, required: true },
    image: { type: String },
    createdBy: {
      type: String,
      default: "worker",
    },
  },
  { timestamps: true }, // createdAt used
);

// ================= WEEK NUMBER LOGIC =================
async function calculateWeekNumber(workerId, hoursCreatedAt) {
  const worker = await mongoose
    .model("worker")
    .findById(workerId)
    .select("createdAt")
    .lean();

  if (!worker || !worker.createdAt) return null;

  const diffMs =
    new Date(hoursCreatedAt).getTime() - new Date(worker.createdAt).getTime();

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

// ================= SAVE HOOK =================
workerHoursSchema.pre("save", async function () {
  // ---- week number ----
  this.weekNumber = await calculateWeekNumber(this.workerId, this.createdAt);

  // ---- HOURS CALCULATION (24h + MIDNIGHT SAFE) ----
  const sh = this.start_working_hours?.hours || 0;
  const sm = this.start_working_hours?.minutes || 0;
  const fh = this.finish_hours?.hours || 0;
  const fm = this.finish_hours?.minutes || 0;

  const startMinutes = sh * 60 + sm;
  let endMinutes = fh * 60 + fm;

  // 🔥 midnight cross handling (22:00 → 02:00)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  let totalMinutes = endMinutes - startMinutes;
  if (totalMinutes < 0) totalMinutes = 0;

  // keep clean number (no long decimals)
  this.total_hours = Math.round((totalMinutes / 60) * 100) / 100;
});

// ================= UPDATE HOOK =================
workerHoursSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate();
  if (!update) return;

  // 🔥 existing doc lao (important)
  const existingDoc = await this.model.findOne(this.getQuery()).lean();

  if (!existingDoc) return;

  const weekNumber = await calculateWeekNumber(
    existingDoc.workerId,
    existingDoc.createdAt,
  );

  update.$set = update.$set || {};
  update.$set.weekNumber = weekNumber;

  this.setUpdate(update);
});

module.exports = mongoose.model("worker_hours", workerHoursSchema);
