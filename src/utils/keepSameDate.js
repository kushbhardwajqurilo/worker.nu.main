function keepSameDateUTC(dateInput, endOfDay = false) {
  if (!dateInput) return null;

  const d = new Date(dateInput);

  if (isNaN(d)) return null;

  // extract using toLocaleString in Asia/Kolkata
  const parts = d
    .toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    })
    .split("-");

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  if (endOfDay) {
    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  }

  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}
module.exports = keepSameDateUTC;
