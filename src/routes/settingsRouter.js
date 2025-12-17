const {
  addCustomField,
  updateCustomField,
  deleteCustomFields,
  getAllCustomfields,
  addPreSelectGroup,
  getAllPreSelectGroup,
  deletePreselectGroup,
  updatePreSelectGroup,
  getSingleGroup,
} = require("../controller/settings/settings.controller");

const settingsRouter = require("express").Router();

// custom field routes
settingsRouter.post("/add-field", addCustomField);
settingsRouter.put("/update-field", updateCustomField);
settingsRouter.delete("/delete-field", deleteCustomFields);
settingsRouter.get("/get-field", getAllCustomfields);

// PreSelect Group
settingsRouter.post("/add-preselect", addPreSelectGroup);
settingsRouter.get("/get-preselect", getAllPreSelectGroup);
settingsRouter.put("/update", updatePreSelectGroup);
settingsRouter.delete("/delete", deletePreselectGroup);
settingsRouter.get("/single-group", getSingleGroup);
module.exports = settingsRouter;
