module.exports = rapid => {
  return function createAuthMiddleware(options = {}) {
    if (typeof options === 'function') {
      options = {
        Model: options,
      };
    }

    const { cookie, Model, ...authOptions } = options;
    const headerAuth = rapid.middleware.headerAuth(authOptions);
    const cookieAuth = rapid.middleware.cookieAuth(cookie, authOptions);

    return function authMiddleware(context, next) {
      if (context.request.headers['Authorization']) {
        return headerAuth(context, handleNext);
      } else {
        return cookieAuth(context, handleNext);
      }

      async function handleNext() {
        if (Model && context.state.user && context.state.user.id) {
          const loadedModel = await Model.query().findById(
            context.state.user.id,
          );
          if (!loadedModel) {
            return context.fail('Auth token data mismatch', 401);
          }
          context.state.user = loadedModel;
        }
        return next();
      }
    };
  };
};
