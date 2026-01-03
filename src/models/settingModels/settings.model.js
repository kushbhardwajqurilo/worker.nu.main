const mongoose = require("mongoose");

// ================== CUSTOM FIELD ==================
const customFieldSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: [true, "tenant-id Requird"],
      ref: "auth",
    },
    type: {
      type: String,

      required: true,
      uppercase: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },
    defaultValue: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      trim: true,
    },

    isRequired: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ================== CUSTOM FIELD GROUP ==================
const customFieldGroupSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: [true, "tenant-id required"],
      ref: "auth",
    },
    groupName: {
      type: String,
      required: true,
      trim: true,
    },

    fields: [
      {
        type: {
          type: String,
          uppercase: true,
        },

        label: {
          type: String,
          trim: true,
        },
        defaultValue: {
          type: String,
          default: "",
        },
        description: {
          type: String,
          trim: true,
        },

        isRequired: {
          type: Boolean,
          default: false,
        },

        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    isRequired: {
      type: Boolean,
      default: false,
    },
    defaultValue: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// hoildays and sickness

const holidaySicknessSettingsSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: [true, "tenant Required"] },
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
const CustomField = mongoose.model("CustomField", customFieldSchema);
const CustomFieldGroup = mongoose.model(
  "CustomFieldGroup",
  customFieldGroupSchema
);
const HolidaySickness = mongoose.model(
  "leaves-setting",
  holidaySicknessSettingsSchema
);
module.exports = {
  CustomField,
  CustomFieldGroup,
  HolidaySickness,
};
