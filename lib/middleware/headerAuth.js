module.exports = rapid => {
  const jwtMiddleware = require('koa-jwt');

  return function headerAuthMiddleware(options = {}) {
    return jwtMiddleware({
      ...rapid.webserver.config.jwt,
      secret: rapid.secret,
      ...options,
    });
  };
};
