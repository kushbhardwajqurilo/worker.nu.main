const cron = require("node-cron");
const mongoose = require("mongoose");
const { WorkerReminder, Notification } = require("../../models/reminder.model");
const adminModel = require("../../models/authmodel/adminModel");
const { getIo } = require("../../socket/socket");

const startReminder = cron.schedule(
  "13 12 * * *",
  async () => {
    try {
      // DB READY CHECK
      const io = getIo();
      if (mongoose.connection.readyState !== 1) {
        console.log("⏳ DB not ready, skipping reminder cron");
        return;
      }
      console.log("🔔 Reminder cron started");

      const today = new Date().toISOString().split("T")[0];
      const reminders = await WorkerReminder.find({ isSent: false });

      if (!reminders || reminders.length === 0) {
        console.log("❌ No reminders found");
        return;
      }
      for (const reminder of reminders) {
        const reminderDate = new Date(reminder.date)
          .toISOString()
          .split("T")[0];
        if (reminderDate !== today) {
          continue;
        }
        //  check if reminder for manager
        if (reminder.manager !== null && reminder.reminderFor === "manager") {
          console.log("reminder", reminder);
          const manager = await adminModel.findOne({
            tenantId: reminder.tenantId,
          });
          if (!manager) {
            return;
          }
          const noti = await Notification.create({
            tenantId: reminder.tenantId,
            userId: manager?._id,
            title: reminder.title,
            message: reminder.note,
          });
          reminder.isSent = true;
          await reminder.save();

          io.to(`user_${manager?._id}`).emit("notification:new", {
            _id: noti?._id,
            tenantId: reminder?.tenantId,
            title: reminder.title,
            message: reminder.note,
            userId: manager?._id,
            type: "SUCCESS",
          });
        }

        // check if reminder for worker
        if (
          reminder.workerId.length !== 0 &&
          reminder.reminderFor === "worker"
        ) {
          for (const ids of reminder.workerId) {
            await Notification.create({
              tenantId: reminder.tenantId,
              userId: ids,
              title: reminder.title,
              message: reminder.note,
            });
          }
          reminder.isSent = true;
          await reminder.save();
        }

        // if reminder for both worker and manager

        if (reminder.reminderFor === "both") {
          console.log("running");
          for (const ids of reminder.workerId) {
            console.log(ids);
            await Notification.create({
              tenantId: reminder.tenantId,
              userId: ids,
              title: reminder.title,
              message: reminder.note,
            });
          }
          await Notification.create({
            userId: reminder.manager,
            title: reminder.title,
            message: reminder.note,
          });

          reminder.isSent = true;
          await reminder.save();
        }
      }
    } catch (error) {
      console.error("❌ Reminder cron error:", error.message);
    }
  },
  {
    scheduled: false, // important for cluster
    timezone: "Asia/Kolkata",
  },
);

module.exports = startReminder;
