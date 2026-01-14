const mongoose = require("mongoose");
const workerCouterModel = require("./workerCouter.model");

const workerSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    tenantId: {
      type: String,
      required: [true, "tenant Required"],
      ref: "auth",
    },
    // ---- worker personal details ----
    worker_personal_details: {
      firstName: {
        type: String,
        required: [true, "worker first name required"],
      },
      lastName: { type: String, default: "" },
      phone: {
        type: String,
        required: [true, "worker phone number required"],
        unique: [true, "phone number already in use"],
      },
    },

    // ---- worker position ----
    worker_position: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "worker_position",
      },
    ],

    // ---- worker project ----
    project: [
      {
        projectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "project",
          required: [true, "project required"],
        },
      },
    ],

    // ---- language ----
    language: {
      type: [String],
      enum: ["english", "russian", "lithuanian"],
    },
    worker_holiday: {
      remaining_holidays: { type: Number, default: 0 },
      holidays_per_month: { type: Number, default: 0 },
      holidays_taken: { type: Number, default: 0 },
      sickness_per_month: { type: Number, default: 0 },
      remaining_sickness: { type: Number, default: 0 },
      sickness_taken: { type: Number, default: 0 },
    },

    worker_economical_data: {
      worker_hourly_cost: { type: Number },
      worker_hourly_salary: { type: Number },
    },

    // ---- worker personal information ----
    personal_information: {
      documents: {
        profile_picture: { type: String, default: null },
        drivers_license: { type: String, default: null },
        passport: { type: String, default: null },
        national_id_card: { type: String, default: null },
        worker_work_id: { type: String, default: null },
        other_files: {
          type: [
            {
              folderName: { type: String },
              file: { type: String },
            },
          ],
          default: [],
        },
      },
      email: { type: String },

      date_of_birth: { type: Date },

      bank_details: {
        bank_name: { type: String },
        swift: { type: String },
        international_bank_account_number: { type: String },
        local_bank_account_number: { type: String },
        tax_identification_number: { type: String },
      },

      address_details: {
        street: { type: String },
        house_apartment_number: { type: String },
        city: { type: String },
        country: { type: String },
        post: { type: String },
      },

      close_contact: {
        name: { type: String },
        surname: { type: String },
        email: { type: String },
        phone_number: { type: String },
        notes: { type: String },
      },
      clothing_sizes: {
        suit_size: { type: String, default: null },
        tshirt_jacket_size: { type: String },
        pants_size: { type: String },
        shoes_size: { type: String },
        additional_information: { type: String },
      },
    },

    // ---- global flags ----
    isDelete: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    dashboardUrl: { type: String, default: null },
    urlVisibleToAdmin: { type: Boolean, default: true },

    urlAdminExpireAt: {
      type: Date,
      default: () => Date.now() + 24 * 60 * 60 * 1000,
    },
    signature: { type: String, default: null },
    isSign: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// ==== WORKER POSITION SCHEMA FIXED ====
const workerPositionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: [true, "position required"],
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const workerPositionModel = mongoose.model(
  "worker_position",
  workerPositionSchema
);

workerSchema.pre("save", async function () {
  // if already generated
  if (this.id) return;

  const counter = await workerCouterModel.findOneAndUpdate(
    {
      tenantId: this.tenantId,
      key: "worker",
    },
    {
      $inc: { seq: 1 },
    },
    {
      new: true,
      upsert: true,
    }
  );

  this.id = `E-${counter.seq}`;
});

const workerModel = mongoose.model("worker", workerSchema);
module.exports = { workerModel, workerPositionModel };
