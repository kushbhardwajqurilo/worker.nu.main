function getWeeksSinceCreated(joiningDate, referenceDate) {
  if (!joiningDate || !referenceDate) return 0;

  const start = new Date(joiningDate);
  const ref = new Date(referenceDate);

  start.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const startMonday = getMonday(start);
  const refMonday = getMonday(ref);

  const diffInMs = refMonday - startMonday;
  const diffInWeeks = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 7));

  return diffInWeeks + 1; // Week 1 se start
}

module.exports = getWeeksSinceCreated;
