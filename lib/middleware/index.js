module.exports = rapid => ({
  auth: require('./auth')(rapid),
  graphql: require('./graphql')(rapid),
  login: require('./login')(rapid),
  validate: require('./validate')(rapid)
});
