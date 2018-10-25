module.exports = rapid => ({
  auth: require('./auth')(rapid),
  login: require('./login')(rapid),
  socketAuth: require('./socketAuth')(rapid),
  validate: require('./validate')(rapid),
});
