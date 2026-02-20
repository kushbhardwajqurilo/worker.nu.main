const { default: mongoose } = require("mongoose");

const companyAlias = new mongoose.Schema({
  tenantId: { type: String, required: [true, "tenant-id required"] },
  logo: { type: String, default: "" },
  company_name: { type: String, required: [true, "Company Name Requried"] },
  phone: { type: String, required: [true, "Company Phone Number Required"] },
  company_registration_no: {
    type: String,
    required: [true, "Registration Number Required"],
  },
  company_address: {
    type: String,
    required: [true, "Company Address Required"],
  },
  language: { type: String, enum: ["english", "lithuanian"] },
});

const companyAliasModel = mongoose.model("compay_alias", companyAlias);
module.exports = companyAliasModel;
