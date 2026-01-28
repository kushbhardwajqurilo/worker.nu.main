const {
  getNotificationToWorker,
  markAsRead,
} = require("../controller/notifications/notification.controller");
const {
  workerAuthMiddleware,
  accessMiddleware,
} = require("../middleware/authMiddleware");

const notificationRouter = require("express").Router();

notificationRouter.get(
  "/",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  getNotificationToWorker,
);
notificationRouter.patch(
  "/:id",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  markAsRead,
);
module.exports = notificationRouter;
