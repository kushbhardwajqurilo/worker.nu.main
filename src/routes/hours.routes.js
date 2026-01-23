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
} = require("../controller/hours/hours.controller");
const {
  authMiddeware,
  accessMiddleware,
  workerOrAdminAuthMiddleware,
  clientOrAdminAuthMiddleware,
  clientAuthMiddleware,
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
hoursRouter.put("/update-hours", updateWorkerHours);

// /* ---------------- GET ONE HOURS RECORD ----------------- */
hoursRouter.get("/single", getSingleHoursDetailsController);
// example: /hours/single?h_id=12345

/* ---------------- GET ALL HOURS OF WORKER ------------- */
hoursRouter.get(
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
hoursRouter.patch(
  "approve-hours",
  clientAuthMiddleware,
  accessMiddleware("client"),
  approveHours,
);
// dashboard hours
hoursRouter.get("/get-hours", dashboardHours);

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
module.exports = hoursRouter;
