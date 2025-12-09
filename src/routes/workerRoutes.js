const {
  addWorker,
  getSingleWorkerController,
  updateWorkerController,
  deleteWorkerController,
  getAllWorkerController,
  makeInActiveWorker,
  multipleDeleteWorkerController,
  searchWorkerController,
} = require("../controller/worker/worker.controller");
const {
  authMiddeware,
  accessMiddleware,
} = require("../middleware/authMiddleware");
const workerRouter = require("express").Router();
workerRouter.post(
  "/add-worker",
  authMiddeware,
  accessMiddleware("admin"),
  addWorker
); // add worker route
workerRouter.put(
  "/update-worker",
  authMiddeware,
  accessMiddleware("admin"),
  updateWorkerController
); // update worker
workerRouter.get("/get-single-worker", getSingleWorkerController);
workerRouter.delete(
  "/delete-worker",
  authMiddeware,
  accessMiddleware("admin"),
  deleteWorkerController
); // delete worker
workerRouter.get(
  "/get-all-worker",
  authMiddeware,
  accessMiddleware("admin"),
  getAllWorkerController
);
workerRouter.patch(
  "/inactive-worker",
  authMiddeware,
  accessMiddleware("admin"),
  makeInActiveWorker
); // InActive worker
workerRouter.post(
  "/multiple-delete-worker",
  authMiddeware,
  accessMiddleware("admin"),
  multipleDeleteWorkerController
);
workerRouter.get(
  "/search-worker",
  authMiddeware,
  accessMiddleware("admin"),
  searchWorkerController
);
module.exports = workerRouter;
