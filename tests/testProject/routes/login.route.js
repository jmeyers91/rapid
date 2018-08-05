module.exports = rapid =>
  rapid.api.post(
    '/auth/login',
    rapid.middleware.login(credentials =>
      rapid.controllers.userController.login(credentials)
    ),
    context => {
      context.response.body = {
        authToken: context.state.authToken,
        user: context.state.user
      };
      context.response.status = 200;
    }
  );
