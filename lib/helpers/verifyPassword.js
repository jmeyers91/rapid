module.exports = () => {
  const bcrypt = require('bcryptjs');

  return function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  };
};
