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
      lateTime: "00:00",
      lateMinutes: 0,
    };
  }

  if (!projectDate || !finishHours || !submittedAt) {
    return {
      isLate: false,
      lateTime: "00:00",
      lateMinutes: 0,
    };
  }

  const endHour = Number(finishHours.hours) || 0;
  const endMinute = Number(finishHours.minutes) || 0;

  // Build project end datetime
  const projectEnd = new Date(projectDate);
  projectEnd.setHours(endHour, endMinute + graceMinutes, 0, 0);

  const submittedDate = new Date(submittedAt);

  if (submittedDate <= projectEnd) {
    return {
      isLate: false,
      lateTime: "00:00",
      lateMinutes: 0,
    };
  }

  const diffMs = submittedDate - projectEnd;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    isLate: true,
    lateMinutes: totalMinutes,
    lateTime: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
};

module.exports = calculateLateByProjectEnd;
