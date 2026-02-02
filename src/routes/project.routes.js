const {
  addProjectController,
  getAllProjectsController,
  getSingleProjectController,
  updateProjectController,
  workerList,
  clientList,
  getProjectPictures,
  deleteProjectController,
  markAsComplete,
  addWorkerInProject,
  getProjectEconomy,
  projectWorkerList,
} = require("../controller/project/project.controller");
const {
  authMiddeware,
  accessMiddleware,
} = require("../middleware/authMiddleware");
const { uploadDocuments } = require("../middleware/upload.middleware");

const projectRouter = require("express").Router();

projectRouter.post(
  "/add-project",
  authMiddeware,
  accessMiddleware("admin"),
  uploadDocuments,
  addProjectController,
); // add project route

projectRouter.post(
  "/get-projects",
  authMiddeware,
  accessMiddleware("admin"),
  getAllProjectsController,
); // get all projects route

projectRouter.get(
  "/get-project",
  authMiddeware,
  accessMiddleware("admin"),
  getSingleProjectController,
); // get single project route

projectRouter.get(
  "/worker-list",
  authMiddeware,
  accessMiddleware("admin"),
  workerList,
);
projectRouter.get(
  "/client-list",
  authMiddeware,
  accessMiddleware("admin"),
  clientList,
);
projectRouter.get(
  "/project-picture",
  authMiddeware,
  accessMiddleware("admin"),
  getProjectPictures,
);
projectRouter.patch(
  "/update-project",
  authMiddeware,
  accessMiddleware("admin"),
  updateProjectController,
); // update project route
projectRouter.delete(
  "/delete-project",
  authMiddeware,
  accessMiddleware("admin"),
  deleteProjectController,
);
projectRouter.patch(
  "/mark-complete",
  authMiddeware,
  accessMiddleware("admin"),
  markAsComplete,
);
projectRouter.put(
  "/add-update-worker",
  authMiddeware,
  accessMiddleware("admin"),
  addWorkerInProject,
);
projectRouter.get(
  "/project-economy",
  authMiddeware,
  accessMiddleware("admin"),
  getProjectEconomy,
);

projectRouter.get(
  "/prject-workers",
  authMiddeware,
  accessMiddleware("admin"),
  projectWorkerList,
);
module.exports = projectRouter;
