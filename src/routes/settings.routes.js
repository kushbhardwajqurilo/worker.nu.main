const {
  addWorkerPosition,
  getAllPositions,
  deletePosition,
  addOrUpdateHolidaySettings,
  addOrUpdateSicknessSettings,
  getHolidaySicknessSettings,
  getHolidaySettings,
} = require("../controller/settings/settings.controller");
const {
  authMiddeware,
  accessMiddleware,
} = require("../middleware/authMiddleware");
const settingsRouter = require("express").Router();

settingsRouter.post(
  "/add-position",
  authMiddeware,
  accessMiddleware("admin"),
  addWorkerPosition
);
settingsRouter.get(
  "/get-position",
  authMiddeware,
  accessMiddleware("admin"),
  getAllPositions
);
settingsRouter.delete(
  "/delete-position",
  authMiddeware,
  accessMiddleware("admin"),
  deletePosition
);
// Holiday & sickness
settingsRouter.post(
  "/holiday",
  authMiddeware,
  accessMiddleware("admin"),
  addOrUpdateHolidaySettings
);
settingsRouter.post(
  "/sickness",
  authMiddeware,
  accessMiddleware("admin"),
  addOrUpdateSicknessSettings
);
settingsRouter.get(
  "/get-sickness",
  authMiddeware,
  accessMiddleware("admin"),
  getHolidaySicknessSettings
);
settingsRouter.get(
  "/get-holiday",
  authMiddeware,
  accessMiddleware("admin"),
  getHolidaySettings
);
module.exports = settingsRouter;
