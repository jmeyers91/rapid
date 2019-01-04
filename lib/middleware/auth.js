module.exports = rapid => {
  return function createAuthMiddleware({ cookie, ...options } = {}) {
    const headerAuth = rapid.middleware.headerAuth(options);
    const cookieAuth = rapid.middleware.cookieAuth(cookie, options);

    return function authMiddleware(context, next) {
      if (context.request.headers['Authorization']) {
        return headerAuth(context, next);
      } else {
        return cookieAuth(context, next);
      }
    };
  };
};
