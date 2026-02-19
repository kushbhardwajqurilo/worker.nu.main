const mongoose = require("mongoose");
const workerRequestSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      ref: "auth",
      required: [true, "tenant required"],
    },
    workerId: {
      type: mongoose.Types.ObjectId,
      ref: "worker",
      required: [true, "worker id requried"],
    },
    worker_personal_details: {
      surname: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      date_of_birth: { type: Boolean, default: false },
      address_details: { type: Boolean, default: false },
      tax_identification_number: { type: Boolean, default: false },
      closeEmail: { type: Boolean, default: false },
      firstName: { type: Boolean, default: false },
      lastName: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      profile_picture: { type: Boolean, default: false },
    },
    personal_information: {
      upload_docs: {
        passport: { type: Boolean, default: false },
        national_id_card: { type: Boolean, default: false },
        drivers_license: { type: Boolean, default: false },
      },
      bank_details: {
        bank_name: { type: Boolean, default: false },
        swift: { type: Boolean, default: false },
        international_bank_account_number: { type: Boolean, default: false },
        local_bank_account_number: { type: Boolean, default: false },
      },

      clothing_sizes: {
        suit_size: { type: Boolean, default: false },
        tshirt_jacket_size: { type: Boolean, default: false },
        pants_size: { type: Boolean, default: false },
        shoes_size: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true },
);
workerRequestSchema.index({ tenantId: 1 });
const workerRequestModel = mongoose.model(
  "worker_request",
  workerRequestSchema,
);
module.exports = workerRequestModel;
