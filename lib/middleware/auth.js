module.exports = rapid => {
  const jwtMiddleware = require('koa-jwt');

  return function authMiddleware() {
    return jwtMiddleware(rapid.webserver.config.jwt);
  };
};
