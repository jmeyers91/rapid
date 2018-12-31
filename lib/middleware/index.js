module.exports = rapid => ({
  auth: require('./auth')(rapid),
  headerAuth: require('./headerAuth')(rapid),
  cookieAuth: require('./cookieAuth')(rapid),
  login: require('./login')(rapid),
  socketAuth: require('./socketAuth')(rapid),
  validate: require('./validate')(rapid),
});
