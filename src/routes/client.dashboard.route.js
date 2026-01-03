const {
  getClientInformation,
} = require("../controller/client/clientdashboard.controller");
const {
  clientAuthMiddleware,
  accessMiddleware,
} = require("../middleware/authMiddleware");

const clientDashboardRouter = require("express").Router();
clientDashboardRouter.post(
  "/get-client",
  clientAuthMiddleware,
  getClientInformation,
  accessMiddleware("client")
);

module.exports = clientDashboardRouter;
