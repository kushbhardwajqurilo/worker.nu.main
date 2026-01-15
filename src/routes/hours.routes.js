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
} = require("../controller/hours/hours.controller");
const {
  authMiddeware,
  accessMiddleware,
} = require("../middleware/authMiddleware");

const hoursRouter = require("express").Router();

// < ---------------- CLOUDINARY SIGNATURE ---------------- >

/* ---------------- CREATE HOURS (Worker) ---------------- */
hoursRouter.post(
  "/submit-hours",
  authMiddeware,
  accessMiddleware("admin"),
  hoursImageUpload.single("file"),
  createWorkerHours
);

/* ---------------- UPDATE HOURS (Worker/Admin) ---------- */
hoursRouter.put("/update-hours", updateWorkerHours);

// /* ---------------- GET ONE HOURS RECORD ----------------- */
hoursRouter.get("/single", getSingleHoursDetailsController);
// example: /hours/single?h_id=12345

/* ---------------- GET ALL HOURS OF WORKER ------------- */
hoursRouter.get(
  "/worker-all",
  authMiddeware,
  accessMiddleware("admin"),
  getAllHoursOfWorkerController
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

// dashboard hours
hoursRouter.get("/get-hours", dashboardHours);

hoursRouter.get(
  "/single-worker-hour",
  authMiddeware,
  accessMiddleware("admin"),
  getSingleWorkerWeeklyHoursController
);
module.exports = hoursRouter;
