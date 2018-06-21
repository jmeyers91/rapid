
module.exports = rapid => ({
  auth: require('./auth')(rapid),
  login: require('./login')(rapid),
  resource: require('./resource')(rapid),
});
