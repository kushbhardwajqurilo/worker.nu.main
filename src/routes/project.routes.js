const {
  addProjectController,
  getAllProjectsController,
  getSingleProjectController,
  updateProjectController,
  workerList,
} = require("../controller/project/project.controller");
const {
  authMiddeware,
  accessMiddleware,
} = require("../middleware/authMiddleware");

const projectRouter = require("express").Router();

projectRouter.post(
  "/add-project",
  authMiddeware,
  accessMiddleware("admin"),
  addProjectController
); // add project route

projectRouter.get(
  "/get-projects",
  authMiddeware,
  accessMiddleware("admin"),
  getAllProjectsController
); // get all projects route

projectRouter.get(
  "/get-project",
  authMiddeware,
  accessMiddleware("admin"),
  getSingleProjectController
); // get single project route

projectRouter.get(
  "/worker-list",
  authMiddeware,
  accessMiddleware("admin"),
  workerList
);
projectRouter.patch("/update-project", updateProjectController); // update project route
module.exports = projectRouter;
