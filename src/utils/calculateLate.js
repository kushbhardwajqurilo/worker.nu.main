const calculateLateByProjectEnd = ({
  projectDate,
  finishHours, // { hours: Number, minutes: Number }
  submittedAt,
  dayOff = false,
  graceMinutes = 0,
}) => {
  // Day off → never late
  if (dayOff) {
    return {
      isLate: false,
      lateTime: "0h",
      lateMinutes: 0,
    };
  }

  if (!projectDate || !finishHours || !submittedAt) {
    return {
      isLate: false,
      lateTime: "0h",
      lateMinutes: 0,
    };
  }

  const endHour = Number(finishHours.hours) || 0;
  const endMinute = Number(finishHours.minutes) || 0;

  /* ---------- PROJECT END ---------- */
  const projectEnd = new Date(projectDate);
  projectEnd.setHours(endHour, endMinute + graceMinutes, 0, 0);

  const submittedDate = new Date(submittedAt);

  if (submittedDate <= projectEnd) {
    return {
      isLate: false,
      lateTime: "0h",
      lateMinutes: 0,
    };
  }

  /* ---------- DIFF ---------- */
  const diffMs = submittedDate - projectEnd;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  // 🔥 minutes → hours (ROUND UP)
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
    lateMinutes: totalMinutes, // raw minutes (DB / penalty logic)
    lateTime: lateTimeLabel, // UI: "1day 6h"
  };
};

module.exports = calculateLateByProjectEnd;
