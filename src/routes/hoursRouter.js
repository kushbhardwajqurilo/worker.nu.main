const {
  createWorkerHours,
  updateWorkerHours,
  getSingleHoursDetailsController,
  getAllHoursOfWorkerController,
  getWeeklyHours,
  approveWeek,
  dashboardHours,
} = require("../controller/hours/hours.controller");

const { getCloudinarySignature } = require("../confing/cloudinaryConfig");

const hoursRouter = require("express").Router();

// < ---------------- CLOUDINARY SIGNATURE ---------------- >
hoursRouter.get("/get-url", getCloudinarySignature);

/* ---------------- CREATE HOURS (Worker) ---------------- */
hoursRouter.post("/submit-hours", createWorkerHours);

/* ---------------- UPDATE HOURS (Worker/Admin) ---------- */
hoursRouter.put("/update-hours", updateWorkerHours);

// /* ---------------- GET ONE HOURS RECORD ----------------- */
hoursRouter.get("/single", getSingleHoursDetailsController);
// example: /hours/single?h_id=12345

/* ---------------- GET ALL HOURS OF WORKER ------------- */
hoursRouter.get("/worker-all", getAllHoursOfWorkerController);
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
module.exports = hoursRouter;
