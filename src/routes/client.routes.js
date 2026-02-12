const {
  addClient,
  deleteClientController,
  getAllClientController,
  getSingleClientController,
  updateClientController,
  deleteMultipleClients,
  clientSignature,
  getClientWorkers,
  downloadReportExcel,
  generateReport,
  weeklyReport,
  getClientNamesForFilter,
  sendClientMessage,
  updateIsReady,
} = require("../controller/client/client.controller");
const {
  isClientSign,
  getAllHoursOfWorkerToClientController,
  getSingleWorkerWeeklyHoursToClientController,
} = require("../controller/client/clientDashboard.controller");
const {
  authMiddeware,
  accessMiddleware,
  clientAuthMiddleware,
} = require("../middleware/authMiddleware");
const upload = require("../middleware/cloudinaryMiddleware");

const clientRouter = require("express").Router();

clientRouter.post(
  "/add-client",
  authMiddeware,
  accessMiddleware("admin"),
  addClient,
); // add client by admin route
clientRouter.get(
  "/get-clients",
  authMiddeware,
  accessMiddleware("admin"),
  getAllClientController,
); // get all client for admin route

clientRouter.get(
  "/get-single-client",
  authMiddeware,
  accessMiddleware("admin", "worker"),
  getSingleClientController,
); // get single client details route

clientRouter.put(
  "/update-client",
  authMiddeware,
  accessMiddleware("admin"),
  updateClientController,
); // update client router
clientRouter.delete(
  "/delete-client",
  authMiddeware,
  accessMiddleware("admin"),
  deleteClientController,
); // delete client by admin route

clientRouter.delete(
  "/delete-multiple",
  authMiddeware,
  accessMiddleware("admin"),
  deleteMultipleClients,
); // delete multiple client

clientRouter.post(
  "/signature",
  upload.single("signature"),
  clientAuthMiddleware,
  accessMiddleware("client"),
  clientSignature,
);

// client worker
clientRouter.get("/client-worker", getClientWorkers);
// clientRouter.get("/get-weekly-report", generateReport);
clientRouter.get("/get-weekly-report", weeklyReport);

clientRouter.get(
  "/get-filter-name",
  authMiddeware,
  accessMiddleware("admin"),
  getClientNamesForFilter,
);
clientRouter.get(
  "/client-sign",
  clientAuthMiddleware,
  accessMiddleware("client"),
  isClientSign,
);
clientRouter.post(
  "/client-worker-hours",
  clientAuthMiddleware,
  accessMiddleware("client"),
  getAllHoursOfWorkerToClientController,
);
clientRouter.post(
  "/client-single-workers-hours",
  clientAuthMiddleware,
  accessMiddleware("client"),
  getSingleWorkerWeeklyHoursToClientController,
);

clientRouter.get(
  "/client-message",
  clientAuthMiddleware,
  accessMiddleware("client"),
  sendClientMessage,
);
clientRouter.patch(
  "/read-update",
  clientAuthMiddleware,
  accessMiddleware("client"),
  updateIsReady,
);
module.exports = clientRouter;
