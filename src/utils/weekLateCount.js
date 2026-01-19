const calculateLateHoursByDate = ({
  projectDate,
  createdAt,
  dayOff = false,
}) => {
  if (dayOff || !projectDate || !createdAt) {
    return {
      isLate: false,
      lateHours: 0,
      lateTime: "00:00",
    };
  }

  const projectDay = new Date(projectDate);
  const createdDate = new Date(createdAt);

  // normalize to YYYY-MM-DD
  const projectDateOnly = projectDay.toISOString().split("T")[0];
  const createdDateOnly = createdDate.toISOString().split("T")[0];

  // ✅ Same date → NOT late
  if (projectDateOnly === createdDateOnly) {
    return {
      isLate: false,
      lateHours: 0,
      lateTime: "00:00",
    };
  }

  // Project date end (23:59:59)
  const projectEnd = new Date(projectDay);
  projectEnd.setHours(23, 59, 59, 999);

  // created before project end → not late
  if (createdDate <= projectEnd) {
    return {
      isLate: false,
      lateHours: 0,
      lateTime: "00:00",
    };
  }

  const diffMs = createdDate - projectEnd;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    isLate: true,
    lateHours: hours, // ✅ TOTAL HOURS
    lateTime: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
};

module.exports = calculateLateHoursByDate;
