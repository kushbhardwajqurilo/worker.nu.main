const {
  getNotificationToWorker,
  markAsRead,
} = require("../controller/notifications/notification.controller");
const {
  workerAuthMiddleware,
  accessMiddleware,
  workerOrAdminAuthMiddleware,
} = require("../middleware/authMiddleware");

const notificationRouter = require("express").Router();

notificationRouter.get(
  "/",
  workerOrAdminAuthMiddleware,
  accessMiddleware("worker", "admin"),
  getNotificationToWorker,
);
notificationRouter.patch(
  "/:id",
  workerOrAdminAuthMiddleware,
  accessMiddleware("worker", "admin"),
  markAsRead,
);
module.exports = notificationRouter;
