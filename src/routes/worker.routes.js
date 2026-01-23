const {
  addWorker,
  getSingleWorkerController,
  updateWorkerController,
  deleteWorkerController,
  getAllWorkerController,
  makeInActiveWorker,
  multipleDeleteWorkerController,
  searchWorkerController,
  getHolidays,
  getSickness,
  workerSignature,
  getAllProjectsToWorkerAddController,
  getAllPositions,
  requestLeave,
  getWorkerAssingedProjects,
  getSingleProjectDetailsForWorker,
  isSignWorker,
  getWorkerHolidayDetails,
  getAllHoursForWorkers,
  LastAndThisWeekTotalHours,
} = require("../controller/worker/worker.controller");
const {
  authMiddeware,
  accessMiddleware,
  workerAuthMiddleware,
  workerOrAdminAuthMiddleware,
} = require("../middleware/authMiddleware");
const ImageUpload = require("../middleware/signature.middleware");
const uploadSignature = require("../middleware/signature.middleware");
const { uploadDocuments } = require("../middleware/upload.middleware");
const workerRouter = require("express").Router();
workerRouter.post(
  "/add-worker",
  authMiddeware,
  accessMiddleware("admin"),
  uploadDocuments,
  addWorker,
); // add worker route
workerRouter.put(
  "/update-worker",
  authMiddeware,
  accessMiddleware("admin"),
  uploadDocuments,
  updateWorkerController,
); // update worker
workerRouter.get(
  "/get-single-worker",
  authMiddeware,
  accessMiddleware("admin"),
  getSingleWorkerController,
);
workerRouter.delete(
  "/delete-worker",
  authMiddeware,
  accessMiddleware("admin"),
  deleteWorkerController,
); // delete worker
workerRouter.get(
  "/get-all-worker",
  authMiddeware,
  accessMiddleware("admin"),
  getAllWorkerController,
);
workerRouter.patch(
  "/inactive-worker",
  authMiddeware,
  accessMiddleware("admin"),
  makeInActiveWorker,
); // InActive worker
workerRouter.delete(
  "/multiple-delete-worker",
  authMiddeware,
  accessMiddleware("admin"),
  multipleDeleteWorkerController,
);
workerRouter.get(
  "/search-worker",
  authMiddeware,
  accessMiddleware("admin"),
  searchWorkerController,
);

workerRouter.post(
  "/request-leave",
  workerOrAdminAuthMiddleware,
  accessMiddleware("worker", "admin"),
  requestLeave,
);
workerRouter.get(
  "/get-projects",
  authMiddeware,
  accessMiddleware("admin"),
  getAllProjectsToWorkerAddController,
);
workerRouter.get(
  "/get-positions",
  authMiddeware,
  accessMiddleware("admin"),
  getAllPositions,
);

workerRouter.get("/get-holiday", getHolidays);
workerRouter.get("/get-sickness", getSickness);
workerRouter.post(
  "/signature",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  ImageUpload.single("signature"),
  workerSignature,
);
workerRouter.get(
  "/worker-projects",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  getWorkerAssingedProjects,
);
workerRouter.get(
  "/worker-single-projects/:p_id",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  getSingleProjectDetailsForWorker,
);

workerRouter.get(
  "/sign",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  isSignWorker,
);

workerRouter.get(
  "/leave-details/:leaveType",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  getWorkerHolidayDetails,
);
workerRouter.get(
  "/worker-all-hours",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  getAllHoursForWorkers,
);
workerRouter.get(
  "/weekhours",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  LastAndThisWeekTotalHours,
);
module.exports = workerRouter;
