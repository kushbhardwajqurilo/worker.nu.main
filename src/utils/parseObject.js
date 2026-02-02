function parseDottedObject(flatObj) {
  const result = {};

  for (const key in flatObj) {
    const value = flatObj[key];
    const keys = key.replace(/\]/g, "").split(/[.[\]]+/);

    let current = result;

    keys.forEach((k, index) => {
      if (!k) return;

      if (index === keys.length - 1) {
        current[k] = value;
      } else {
        current[k] = current[k] || {};
        current = current[k];
      }
    });
  }

  return result;
}
module.exports = parseDottedObject;
