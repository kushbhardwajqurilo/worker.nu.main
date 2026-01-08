const {
  getHolidayRequest,
  approveLeaveRequest,
  getSicknessRequest,
  setProjectReminder,
  editReminder,
  deleteReminder,
  RejectLeaveRequest,
  DeleteLeaveRequest,
  getApproveLeaves,
} = require("../controller/admin/admin.controller");
const {
  authMiddeware,
  accessMiddleware,
} = require("../middleware/authMiddleware");

const adminRouter = require("express").Router();
adminRouter.get(
  "/holidays",
  authMiddeware,
  accessMiddleware("admin"),
  getHolidayRequest
);

adminRouter.get(
  "/sickness",
  authMiddeware,
  accessMiddleware("admin"),
  getSicknessRequest
);
adminRouter.patch(
  "/approve",
  authMiddeware,
  accessMiddleware("admin"),
  approveLeaveRequest
);

// =================== Reminder ===================
adminRouter.post(
  "/project-reminder",
  authMiddeware,
  accessMiddleware("admin"),
  setProjectReminder
);
adminRouter.put(
  "/edit-reminder",
  authMiddeware,
  accessMiddleware("admin"),
  editReminder
);
adminRouter.delete(
  "/delete-reminder",
  authMiddeware,
  accessMiddleware("admin"),
  deleteReminder
);
adminRouter.patch(
  "/reject-leave",
  authMiddeware,
  accessMiddleware("admin"),
  RejectLeaveRequest
);
adminRouter.delete(
  "/delete-leave",
  authMiddeware,
  accessMiddleware("admin"),
  DeleteLeaveRequest
);

adminRouter.get(
  "/approve-leaves",
  authMiddeware,
  accessMiddleware("admin"),
  getApproveLeaves
);
module.exports = adminRouter;
