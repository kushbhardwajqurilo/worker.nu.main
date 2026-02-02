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
  getReminders,
  getSingleReminder,
  LeaveFilterController,
  reminderFilter,
} = require("../controller/admin/admin.controller");
const {
  authMiddeware,
  accessMiddleware,
} = require("../middleware/authMiddleware");

const adminRouter = require("express").Router();
adminRouter.post(
  "/holidays",
  authMiddeware,
  accessMiddleware("admin"),
  getHolidayRequest,
);

adminRouter.post(
  "/sickness",
  authMiddeware,
  accessMiddleware("admin"),
  getSicknessRequest,
);
adminRouter.patch(
  "/approve",
  authMiddeware,
  accessMiddleware("admin"),
  approveLeaveRequest,
);

// =================== Reminder ===================
adminRouter.post(
  "/reminders",
  authMiddeware,
  accessMiddleware("admin"),
  getReminders,
);
adminRouter.post(
  "/project-reminder",
  authMiddeware,
  accessMiddleware("admin"),
  setProjectReminder,
);
adminRouter.put(
  "/edit-reminder",
  authMiddeware,
  accessMiddleware("admin"),
  editReminder,
);
adminRouter.get(
  "/single-reminder",
  authMiddeware,
  accessMiddleware("admin"),
  getSingleReminder,
);
adminRouter.delete(
  "/delete-reminder",
  authMiddeware,
  accessMiddleware("admin"),
  deleteReminder,
);
adminRouter.patch(
  "/reject-leave",
  authMiddeware,
  accessMiddleware("admin"),
  RejectLeaveRequest,
);
adminRouter.delete(
  "/delete-leave",
  authMiddeware,
  accessMiddleware("admin"),
  DeleteLeaveRequest,
);

adminRouter.post(
  "/approve-leaves",
  authMiddeware,
  accessMiddleware("admin"),
  getApproveLeaves,
);
adminRouter.post(
  "/leave-filter",
  authMiddeware,
  accessMiddleware("admin"),
  LeaveFilterController,
);
adminRouter.post(
  "/reminder-filter",
  authMiddeware,
  accessMiddleware("admin"),
  reminderFilter,
);

module.exports = adminRouter;
