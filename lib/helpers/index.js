module.exports = rapid => ({
  hashPassword: require('./hashPassword')(rapid),
  verifyPassword: require('./verifyPassword')(rapid),
});