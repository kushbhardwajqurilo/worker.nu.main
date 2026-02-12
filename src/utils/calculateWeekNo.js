function getWeeksSinceCreated(createdAt) {
  if (!createdAt) return 0;

  const createdDate = new Date(createdAt);
  const currentDate = new Date();

  if (isNaN(createdDate)) {
    throw new Error("Invalid createdAt date");
  }

  const diffInMs = currentDate.getTime() - createdDate.getTime();

  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  const weeks = Math.floor(diffInDays / 7);

  return weeks; // completed weeks
}

module.exports = getWeeksSinceCreated;
