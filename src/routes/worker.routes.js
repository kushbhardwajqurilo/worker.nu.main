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
  requestInformation,
  getRequestForWorker,
  getWorkerIdendtity,
  updateWorkerDataToRequest,
  makeActiveWorker,
  getWorkerDetailsById,
} = require("../controller/worker/worker.controller");
const {
  authMiddeware,
  accessMiddleware,
  workerAuthMiddleware,
  workerOrAdminAuthMiddleware,
  clientOrAdminAuthMiddleware,
} = require("../middleware/authMiddleware");
const ImageUpload = require("../middleware/signature.middleware");
const uploadSignature = require("../middleware/signature.middleware");
const { uploadDocuments } = require("../middleware/upload.middleware");
const workerRouter = require("express").Router();

workerRouter.get(
  "/leave-details",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  getWorkerHolidayDetails,
);
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
workerRouter.post(
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
workerRouter.patch(
  "/active-worker",
  authMiddeware,
  accessMiddleware("admin"),
  makeActiveWorker,
);
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
  clientOrAdminAuthMiddleware,
  accessMiddleware("admin", "client"),
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

workerRouter.post(
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

// <--------- worker information request ---------->

workerRouter.post(
  "/information-request",
  authMiddeware,
  accessMiddleware("admin"),
  requestInformation,
);

workerRouter.get(
  "/get-request",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  getRequestForWorker,
);

workerRouter.post(
  "/info-data-add",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  uploadDocuments,
  updateWorkerDataToRequest,
);
// <--------- worker information request  End---------->
workerRouter.get(
  "/get-worker-identification",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  getWorkerIdendtity,
);

workerRouter.get(
  "/getWorkerById",
  authMiddeware,
  accessMiddleware("admin"),
  getWorkerDetailsById,
);
module.exports = workerRouter;
