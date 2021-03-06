module.exports = rapid => {
  return function loginMiddleware(resolveUser) {
    if (!resolveUser) {
      throw new Error(
        `rapid.middleware.login requires a user resolver function.`,
      );
    }

    return async (context, next) => {
      const { username, password } = context.request.body;
      if (!username) context.throw(400, 'Username is required.');
      if (!password) context.throw(400, 'Password is required.');
      const user = await resolveUser({ username, password });

      if (!user) context.throw(401, 'Invalid username or password.');

      const authToken = rapid.helpers.modelToJWT(user);
      context.state.authToken = authToken;
      context.state.user = user;
      return next();
    };
  };
};
