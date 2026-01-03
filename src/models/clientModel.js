const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  tenantId: { type: String, required: [true] },
  client_details: {
    client_type: {
      type: String,
      enum: ["private", "business"],
      required: [true, "Client Type Required"],
      trim: true,
    },
    client_name: { type: String, required: [true, "Client Name Required"] },
    client_email: {
      type: String,
      lowercase: true,
      trim: true,
      required: [true, "Client Email Required"],
      validate: {
        validator: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    client_location_address: {
      type: String,
      required: [true, "Client Address Required"],
    },
    city: { type: String, required: [true, "Client City Required"] },
    post_code: { type: String, required: [true, "Post Code Required"] },
    companyName: { type: String, default: null },
    companyRegistrationNo: { type: String, default: null },
  },

  contact_details: [
    {
      phone: { type: String, default: null },
    },
  ],
  additional_notes: { type: String, default: null },
  sign_our_message: { type: String, default: null },
  isDelete: { type: Boolean, default: false },

  // FIX: Not required because you generate after creation
  client_url: {
    type: String,
    default: null,
  },

  clientSignature: {
    type: String,
    default: "blank.png",
  },

  isSignatured: {
    type: Boolean,
    default: false,
  },

  permission: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("client", clientSchema);
