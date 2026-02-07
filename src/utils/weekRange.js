const getWeekRange = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  // Monday as start of week
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

module.exports = getWeekRange;
