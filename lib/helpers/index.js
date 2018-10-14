module.exports = rapid => ({
  hashPassword: require('./hashPassword')(rapid),
  modelToJWT: require('./modelToJWT')(rapid),
  verifyPassword: require('./verifyPassword')(rapid),
});
