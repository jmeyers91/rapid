module.exports = () => {
  const bcrypt = require('bcryptjs');

  return function hashPassword(password) {
    return bcrypt.hash(password, 10);
  };
};
