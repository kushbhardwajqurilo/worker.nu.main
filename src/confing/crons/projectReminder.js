const cron = require("node-cron");
const mongoose = require("mongoose");
const { WorkerReminder, Notification } = require("../../models/reminder.model");

const startReminder = cron.schedule(
  "* * * * *",
  async () => {
    try {
      // DB READY CHECK
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
          await Notification.create({
            userId: reminder.userId,
            title: reminder.title,
            message: reminder.note,
          });
          reminder.isSent = true;
          await reminder.save();
        }

        // check if reminder for worker
        if (
          reminder.workerId.length !== 0 &&
          reminder.reminderFor === "worker"
        ) {
          for (const ids of reminder.workerId) {
            await Notification.create({
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
    scheduled: false, // 🔑 important for cluster
    timezone: "Asia/Kolkata",
  }
);

module.exports = startReminder;
