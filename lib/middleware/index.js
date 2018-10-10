module.exports = rapid => ({
  auth: require('./auth')(rapid),
  login: require('./login')(rapid),
  validate: require('./validate')(rapid),
});
