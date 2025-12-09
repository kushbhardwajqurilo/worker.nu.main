const mongoose = require("mongoose");
const clientSchema = new mongoose.Schema({
  // client basic details
  client_details: {
    client_type: {
      type: "String",
      enum: {
        values: ["Private", "Business"],
        message: "Client Type Must be either Private or Business",
      },
      required: [true, "Client Type Required"],
      trim: true,
    },
    client_name: { type: String, requried: [true, "Client Name Required"] },
    client_email: {
      type: String,
      lowercase: true,
      trim: true,
      required: [true, "Client Email Required"],
      validation: {
        validator: (val) => {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        },
        message: (props) => `${props.value} is not valid email!`,
      },
    },
    client_location_address: {
      type: String,
      required: [true, "Cliend address and location required"],
    },
    city: { type: String, required: [true, "Client City Required"] },
    post_code: { type: String, required: [true, "Post Code Required"] },
  },
  //   client contact details
  contact_details: {
    phone_code: { type: String, default: null },
    phone: { type: Number, default: null },
    additional_contact: [
      {
        name: { type: String, default: null },
        email: { type: String, default: null },
        phone_code: { type: String, default: "Lithuania" },
        phone: { type: Number, default: null },
      },
    ],
  },
  //   additional information
  additional_information: {
    client_notes: {
      type: String,
      default: null,
    },
    sign_our_message: {
      type: String,
      default: null, // message for customer
    },
  },
  isDelete: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("client", clientSchema);
