module.exports = rapid => ({
  hashPassword: require('./hashPassword')(rapid),
  modelToJWT: require('./modelToJWT')(rapid),
  verifyAuthToken: require('./verifyAuthToken')(rapid),
  verifyPassword: require('./verifyPassword')(rapid),
});
