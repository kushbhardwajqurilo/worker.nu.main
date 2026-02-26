const getWeekNumberFromWeekStart = (weekStart) => {
  const tempDate = new Date(
    Date.UTC(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate(),
    ),
  );

  // ISO logic: Thursday decides week year
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));

  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));

  const weekNumber = Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);

  return weekNumber;
};
module.exports = getWeekNumberFromWeekStart;
