const {
  addClient,
  deleteClientController,
  getAllClientController,
  getSingleClientController,
  updateClientController,
  deleteMultipleClients,
} = require("../controller/client/client.controller");
const {
  authMiddeware,
  accessMiddleware,
} = require("../middleware/authMiddleware");

const clientRouter = require("express").Router();

clientRouter.post("/add-client", addClient); // add client by admin route
clientRouter.get(
  "/get-clients",
  authMiddeware,
  accessMiddleware("admin"),
  getAllClientController
); // get all client for admin route

clientRouter.get(
  "/get-single-client",
  authMiddeware,
  accessMiddleware("admin", "worker"),
  getSingleClientController
); // get single client details route

clientRouter.put(
  "/update-client",
  authMiddeware,
  accessMiddleware("admin"),
  updateClientController
); // update client router
clientRouter.delete(
  "/delete-client",
  authMiddeware,
  accessMiddleware("admin"),
  deleteClientController
); // delete client by admin route

clientRouter.delete(
  "/delete-multiple",
  authMiddeware,
  accessMiddleware("admin"),
  deleteMultipleClients
); // delete multiple client
module.exports = clientRouter;
