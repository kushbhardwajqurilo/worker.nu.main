const { hoursImageUpload } = require("../confing/cloudinaryConfig");

const {
  createWorkerHours,
  updateWorkerHours,
  getSingleHoursDetailsController,
  getAllHoursOfWorkerController,
  getWeeklyHours,
  approveWeek,
  dashboardHours,
  getSingleWorkerWeeklyHoursController,
  updateTimeInHours,
  updateHoursCommment,
  approveHours,
  approveHoursByWeekRange,
  checkSubmitHoursOnDateForClientWorker,
  weeklyTimeSheetGenerate,
} = require("../controller/hours/hours.controller");
const {
  authMiddeware,
  accessMiddleware,
  workerOrAdminAuthMiddleware,
  clientOrAdminAuthMiddleware,
  clientAuthMiddleware,
  workerAuthMiddleware,
} = require("../middleware/authMiddleware");

const hoursRouter = require("express").Router();

// < ---------------- CLOUDINARY SIGNATURE ---------------- >

/* ---------------- CREATE HOURS (Worker) ---------------- */
hoursRouter.post(
  "/submit-hours",
  workerOrAdminAuthMiddleware,
  accessMiddleware("admin", "worker"),
  hoursImageUpload.single("file"),
  createWorkerHours,
);

/* ---------------- UPDATE HOURS (Worker/Admin) ---------- */
hoursRouter.post(
  "/approve-hours",
  clientAuthMiddleware,
  accessMiddleware("client"),
  approveHours,
);

hoursRouter.put("/update-hours", updateWorkerHours);
// /* ---------------- GET ONE HOURS RECORD ----------------- */
hoursRouter.get("/single", getSingleHoursDetailsController);
// example: /hours/single?h_id=12345

/* ---------------- GET ALL HOURS OF WORKER ------------- */
hoursRouter.post(
  "/worker-all",
  clientOrAdminAuthMiddleware,
  accessMiddleware("admin", "client"),
  getAllHoursOfWorkerController,
);
// example: /hours/worker-all?w_id=12345

/* ---------------- GET WEEKLY GROUPED HOURS ------------ */
/*
UI: WEEK cards view (for admin & client)
Params: workerId, year
*/
hoursRouter.get("/weekly", getWeeklyHours);

/* ---------------- APPROVE FULL WEEK ------------------- */
/*
UI: Approve button (client/admin)
Body: { workerId, weekNumber }
*/
hoursRouter.patch("/approve-week", approveWeek);

// client hours approve

// dashboard hours
hoursRouter.get(
  "/get-hours",
  clientAuthMiddleware,
  accessMiddleware("client"),
  dashboardHours,
);

hoursRouter.get(
  "/single-worker-hour",
  clientOrAdminAuthMiddleware,
  accessMiddleware("admin", "client"),
  getSingleWorkerWeeklyHoursController,
);
hoursRouter.put(
  "/update-hours_timing",
  authMiddeware,
  accessMiddleware("admin"),
  updateTimeInHours,
);
hoursRouter.patch(
  "/update-comments",
  authMiddeware,
  accessMiddleware("admin"),
  updateHoursCommment,
);

// weekly hours approve by client
hoursRouter.put(
  "/weekhours-approve",
  clientAuthMiddleware,
  accessMiddleware("client"),
  approveHoursByWeekRange,
);

// <----- check submited hours by date --------->
hoursRouter.post(
  "/check-hours",
  workerAuthMiddleware,
  accessMiddleware("worker"),
  checkSubmitHoursOnDateForClientWorker,
);
// <-----end ------->

// <------ weeekly reports start ----------->
hoursRouter.post(
  "/worker-weekly-timesheet",
  clientOrAdminAuthMiddleware,
  accessMiddleware("client", "admin"),
  weeklyTimeSheetGenerate,
);
// <------ weeekly reports start end ----------->
module.exports = hoursRouter;
