module.exports = rapid => {
  const jwtMiddleware = require('koa-jwt');

  return function authMiddleware(options={}) {
    return jwtMiddleware({
      ...rapid.webserver.config.jwt,
      secret: rapid.secret,
      ...options,
    });
  };
};
