const calculateLateHoursByDate = ({
  projectDate,
  createdAt,
  dayOff = false,
}) => {
  if (dayOff || !projectDate || !createdAt) {
    return {
      isLate: false,
      lateHours: 0,
      lateTime: "0h",
    };
  }

  const projectDay = new Date(projectDate);
  const createdDate = new Date(createdAt);

  // normalize to YYYY-MM-DD
  const projectDateOnly = projectDay.toISOString().split("T")[0];
  const createdDateOnly = createdDate.toISOString().split("T")[0];

  // same date → not late
  if (projectDateOnly === createdDateOnly) {
    return {
      isLate: false,
      lateHours: 0,
      lateTime: "0h",
    };
  }

  // project day end
  const projectEnd = new Date(projectDay);
  projectEnd.setHours(23, 59, 59, 999);

  if (createdDate <= projectEnd) {
    return {
      isLate: false,
      lateHours: 0,
      lateTime: "0h",
    };
  }

  /* ---------- DIFF ---------- */
  const diffMs = createdDate - projectEnd;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  // 🔥 IMPORTANT PART
  // convert minutes → hours (ROUND UP)
  const totalHoursRounded = Math.ceil(totalMinutes / 60);

  const days = Math.floor(totalHoursRounded / 24);
  const hours = totalHoursRounded % 24;

  /* ---------- FORMAT ---------- */
  let lateTimeLabel = "";

  if (days > 0) {
    lateTimeLabel += `${days}day`;
  }

  if (hours > 0) {
    lateTimeLabel += `${days > 0 ? " " : ""}${hours}h`;
  }

  if (!lateTimeLabel) {
    lateTimeLabel = "0h";
  }

  return {
    isLate: true,
    lateHours: totalHoursRounded, // numeric, hours only
    lateTime: lateTimeLabel, // e.g. "1day 6h"
  };
};

module.exports = calculateLateHoursByDate;

// shshs
