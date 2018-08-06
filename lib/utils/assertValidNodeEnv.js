module.exports = function assertValidNodeEnv(env) {
  if (env !== 'production' && env !== 'development' && env !== 'test') {
    throw new Error(
      `Invalid NODE_ENV environmental variable: "${env}".\nValid NODE_ENV values: "production", "development", "test".`
    );
  }
  return env;
};
