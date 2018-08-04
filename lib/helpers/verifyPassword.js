module.exports = rapid => {
  const bcrypt = require('bcrypt');

  return function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  };
};
