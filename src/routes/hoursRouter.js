const { getCloudinarySignature } = require("../confing/cloudinaryConfig");
const {
  createWorkerHours,
  updateWorkerHours,
  getSingleHoursDetailsController,
  getAllHoursOfWorkerController,
} = require("../controller/hours/hours.controller");

const hoursRouter = require("express").Router();

hoursRouter.get("/get-url", getCloudinarySignature);
hoursRouter.post("/submit-hours", createWorkerHours);
hoursRouter.put("/update-hours", updateWorkerHours);
hoursRouter.get("/get-single-hour", getSingleHoursDetailsController);
hoursRouter.get("/get-single-worker-hours", getAllHoursOfWorkerController);
module.exports = hoursRouter;
