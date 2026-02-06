const mongoose = require("mongoose");
const hoursSettingSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: [true, "tenant id missing"],
    unique: true,
  },
  late_submission: {
    max_day_limit: {
      type: Number,
      required: [true, "max day required in max day limit"],
    },
    isDisable: { type: Boolean, default: false },
    late_submission_text: {
      type: String,
      required: [true, "late submission message required"],
    },
  },
  max_unquestion_day_limit: {
    type: Number,
    required: [true, "unquestion day limit required"],
  },
});
const HoursSettingsModel = mongoose.model("hours_settings", hoursSettingSchema);
module.exports = HoursSettingsModel;
