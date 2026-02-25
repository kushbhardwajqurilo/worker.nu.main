function keepSameDateUTC(dateInput, endOfDay = false) {
  if (!dateInput) return null;

  const d = new Date(dateInput);
  if (isNaN(d)) return null;

  // use LOCAL getters because frontend date is LOCAL IST
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  if (endOfDay) {
    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  }

  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

module.exports = keepSameDateUTC;
