module.exports = rapid => {
  const defaultCookie = rapid.config.authCookie || 'authToken';
  const tokenPrefix = 'Bearer ';

  return function cookieAuthMiddleware(cookie=defaultCookie, options={}) {
    return rapid.middleware.auth({
      ...options,
      getToken(context) {
        const authToken = context.cookies.get(cookie);
        if(!authToken) return null;
        if(authToken.startsWith(tokenPrefix)) {
          return authToken.slice(tokenPrefix.length);
        }
        return authToken;
      },
    });
  };
};
