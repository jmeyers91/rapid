
module.exports = rapid => {
  const { userController } = rapid.controllers;
  const loginUser = userController.login.bind(userController);

  return new rapid.Router()
    .post('/auth/login', rapid.middleware.login(loginUser), context => {
      context.response.body = {
        authToken: context.state.authToken,
        user: context.state.user,
      };
      context.response.status = 200;
    })
    .get('/auth/secure', rapid.middleware.auth(), context => {
      context.response.body = 'Access granted!';
    })
    .get('/auth/insecure', context => {
      context.response.body = 'Welcome guest!';
    });
};
