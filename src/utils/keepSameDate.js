function keepSameDateUTC(dateInput, endOfDay = false) {
  if (!dateInput) return null;

  const local = new Date(dateInput);
  if (isNaN(local)) return null;

  if (endOfDay) {
    return new Date(
      Date.UTC(
        local.getFullYear(),
        local.getMonth(),
        local.getDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }

  return new Date(
    Date.UTC(
      local.getFullYear(),
      local.getMonth(),
      local.getDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

module.exports = keepSameDateUTC;
