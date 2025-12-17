const moment = require("moment");
const hoursModel = require("../models/hoursModel");
exports.getMonthRange = (monthOffset = 0) => {
  return {
    start: moment().subtract(monthOffset, "month").startOf("month").toDate(),

    end: moment().subtract(monthOffset, "month").endOf("month").toDate(),
  };
};

exports.calculatePercentage = (current, previous) => {
  if (previous === 0 && current > 0) return 100;
  if (previous === 0) return 0;

  return Number((((current - previous) / previous) * 100).toFixed(2));
};

/* 🔹 Total hours */
exports.getTotalHours = async (start, end) => {
  const result = await hoursModel.aggregate([
    {
      $match: {
        project_date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$total_hours" },
      },
    },
  ]);

  return result[0]?.total || 0;
};

/* 🔹 Active workers */
exports.getActiveWorkerIds = async (start, end) => {
  return hoursModel.distinct("workerId", {
    project_date: { $gte: start, $lte: end },
  });
};

/* 🔹 Active projects */
exports.getActiveProjectIds = async (start, end) => {
  return hoursModel.distinct("project.projectId", {
    project_date: { $gte: start, $lte: end },
  });
};
