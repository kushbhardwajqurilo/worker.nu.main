const {
  addWorker,
  getSingleWorkerController,
  updateWorkerController,
  deleteWorkerController,
  getAllWorkerController,
  makeInActiveWorker,
  multipleDeleteWorkerController,
  searchWorkerController,
  requestHoliday,
  requestSickness,
  getHolidays,
  getSickness,
  workerSignature,
  getAllProjectsToWorkerAddController,
  getAllPositions,
} = require("../controller/worker/worker.controller");
const {
  authMiddeware,
  accessMiddleware,
} = require("../middleware/authMiddleware");
const uploadSignature = require("../middleware/signature.middleware");
const { uploadDocuments } = require("../middleware/upload.middleware");
const workerRouter = require("express").Router();
workerRouter.post(
  "/add-worker",
  authMiddeware,
  accessMiddleware("admin"),
  uploadDocuments,
  addWorker
); // add worker route
workerRouter.put(
  "/update-worker",
  authMiddeware,
  accessMiddleware("admin"),
  updateWorkerController
); // update worker
workerRouter.get(
  "/get-single-worker",
  authMiddeware,
  accessMiddleware("admin"),
  getSingleWorkerController
);
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
workerRouter.delete(
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

workerRouter.post(
  "/request-holiday",
  authMiddeware,
  accessMiddleware("admin"),
  requestHoliday
);
workerRouter.get(
  "/get-projects",
  authMiddeware,
  accessMiddleware("admin"),
  getAllProjectsToWorkerAddController
);
workerRouter.get(
  "/get-positions",
  authMiddeware,
  accessMiddleware("admin"),
  getAllPositions
);

workerRouter.post("/request-sickness", requestSickness);
workerRouter.get("/get-holiday", getHolidays);
workerRouter.get("/get-sickness", getSickness);
workerRouter.post("/signature", workerSignature);

module.exports = workerRouter;
