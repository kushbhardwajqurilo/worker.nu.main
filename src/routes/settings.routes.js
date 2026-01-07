const {
  addOrUpdateHolidaySicknessSettings,
  addWorkerPosition,
  getAllPositions,
  deletePosition,
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
  "/leaves",
  authMiddeware,
  accessMiddleware("admin"),
  addOrUpdateHolidaySicknessSettings
);
module.exports = settingsRouter;
