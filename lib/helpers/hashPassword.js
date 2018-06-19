
module.exports = rapid => {
  const bcrypt = require('bcrypt');

  return function hashPassword(password) {
    return bcrypt.hash(password, 10);
  };
}
