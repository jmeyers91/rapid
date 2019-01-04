module.exports = rapid => {
  const jwtMiddleware = require('koa-jwt');
  const defaultCookie = rapid.config.authCookie || 'authToken';
  const tokenPrefix = 'Bearer ';

  return function cookieAuthMiddleware(cookie, options = {}) {
    cookie = cookie || defaultCookie;
    return jwtMiddleware({
      ...rapid.webserver.config.jwt,
      secret: rapid.secret,
      getToken(context) {
        const authToken = context.cookies.get(cookie);
        if (!authToken) return null;
        if (authToken.startsWith(tokenPrefix)) {
          return authToken.slice(tokenPrefix.length);
        }
        return authToken;
      },
      ...options,
    });
  };
};
