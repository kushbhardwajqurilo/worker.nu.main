const mongoose = require("mongoose");
const generateId = require("../utils/generateId");
const projectSchema = new mongoose.Schema(
  {
    // project details
    tenantId: { type: String, required: [true, "tenant-id required"] },
    projectId: { type: String, required: false },
    project_details: {
      project_name: { type: String, required: [true, "Project Name Required"] },
      project_location_address: {
        type: String,
        required: [true, "Project location and address Required"],
      },
      city: { type: String, required: [true, "City Required"] },
      zip: { type: String, required: [true, "Zip Required"] },
      country: { type: String, required: [true, "Country Required"] },
      project_start_date: {
        type: Date,
        required: ["Project Start Date Required"],
      },
      project_color: { type: String, default: null },
      // project description for manager (mandatory)
      project_description: {
        type: String,
        required: [true, "Project description Required For Manager"],
      },
    },

    // daily work hours on the project
    daily_work_hour: {
      shift_start_time: {
        hours: { type: Number, required: [true, "shift start hour requried"] },
        minutes: {
          type: Number,
          required: [true, "shift start minutes required"],
        },
      },
      shift_end_time: {
        hours: { type: Number, required: [true, "shift end hour requried"] },
        minutes: {
          type: Number,
          required: [true, "shift end minutes required"],
        },
      },
      break_time: { type: Number, default: null },
    },

    // add workers to the project
    project_workers: {
      workers: [
        { type: mongoose.Schema.Types.ObjectId, ref: "worker", default: null },
      ],
      comments: {
        limit: { type: Number, default: 20 },
        explanation: { type: String, default: null },
      },
      photos: {
        limit: { type: Number, default: 1 },
        explanation: { type: String, default: null },
      },
    },

    // project details for workers

    project_details_for_workers: {
      description: {
        type: String, // html content from editor
        default: null,
      },

      // files
      files: [
        {
          file_url: { type: String },
        },
      ],

      // folders with files
      folders: [
        {
          folder_name: { type: String },

          folder_files: [
            {
              file_url: { type: String },
            },
          ],
        },
      ],
      contact_information: {
        position: { type: String, default: null },
        phone_code: { type: String, default: "Lithuania(+370)" },
        phone_number: { type: Number, default: null },
      },
    },
    client_details: {
      client: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        ref: "client",
      },
      company_no: {
        type: String,
        default: null,
      },
      email: {
        type: String,
        default: null,
      },
      phone: {
        type: Number,
        default: null,
      },
    },

    // project time and economicaldetails
    project_time_economical_details: {
      // hourly payment
      hourly_rate: {
        hourly_payment_rate: { type: String, default: null },
        hourly_by_position: [
          {
            position: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "worker_position",
              default: null,
            },
            hourly_pay: { type: Number, default: null },
          },
        ],
        total_hours: { type: Number, default: null },
      },

      // fixed payement
      fixed_payment: {
        type: Number,
        default: null,
      },
    },
    isDelete: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    is_complete: { type: Boolean, default: false },
  },
  { timestamps: true },
);
projectSchema.pre("save", async function () {
  if (!this.isNew) return;

  if (!this.projectId) {
    this.projectId = await generateId();
  }
});
projectSchema.index({ tenantId: 1 });
module.exports = mongoose.model("project", projectSchema);
