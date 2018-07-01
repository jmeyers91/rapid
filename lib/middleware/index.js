
module.exports = rapid => ({
  auth: require('./auth')(rapid),
  graphql: require('./graphql')(rapid),
  login: require('./login')(rapid),
  resource: require('./resource')(rapid),
});
