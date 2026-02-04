const calculateEvaluation = (current, last) => {
  // no data in both months
  if (last === 0 && current === 0) {
    return { type: "good", value: "0%" };
  }

  // fresh growth
  if (last === 0 && current > 0) {
    return { type: "good", value: "100%" };
  }

  const change = ((current - last) / last) * 100;
  const rounded = Math.round(change);

  return {
    type: rounded >= 0 ? "good" : "bad",
    value: `${Math.abs(rounded)}%`,
  };
};
module.exports = calculateEvaluation;
