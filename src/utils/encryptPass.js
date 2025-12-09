const bcrypt = require("bcryptjs");

// password encrypt
const hashPassword = async (password) => {
  const salt = await bcrypt.genSaltSync(10);
  return await bcrypt.hashSync(password, salt);
};

// compare password
const comaparePassword = async (oldPassword, hashPass) => {
  return await bcrypt.compareSync(oldPassword, hashPass);
};
module.exports = { hashPassword, comaparePassword };
