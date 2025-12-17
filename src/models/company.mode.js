const { default: mongoose, mongo } = require("mongoose");

const companyFields = {
  logo: { type: String, required: [true, "Company Logo Required"] },
  company_name: { type: String, required: [true, "Company Name Requried"] },
  phone: { type: String, required: [true, "Company Phone Number Required"] },
  timezone: { type: String, required: [true, "Company Time Zone Missing"] },
  company_registration_no: {
    type: String,
    required: [true, "Registration Number Required"],
  },
  company_address: {
    type: String,
    required: [true, "Company Address Required"],
  },
  notification_email: {
    type: String,
    required: [true, "Notification Emai Required"],
  },
  language: { type: String, enum: ["English", "Lithuanian"] },
};

const companySchema = new mongoose.Schema(companyFields);

// company alias shcema
const companyAliasSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: "company", required: [true, "Company ID Required"] },
  company_alias: {
    type: new mongoose.Schema(companyFields, { _id: false }),
    required: [true, "Company alias data required"],
  },
  isDelete:{type:Boolean,default:false}
});

const companyModel = mongoose.model("company", companySchema);
const companyAliasModel = mongoose.model("company_alias", companyAliasSchema);
module.exports = { companyModel, companyAliasModel };
