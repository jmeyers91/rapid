module.exports = rapid => {
  const { userController } = rapid.controllers;
  const { middleware } = rapid;
  const loginUser = userController.login.bind(userController);

  return new rapid.Router()
    .post('/auth/login', middleware.login(loginUser), context => {
      // context.response.body = {
      //   authToken: context.state.authToken,
      //   user: context.state.user,
      // };
      // context.response.status = 200;
      context.success({
        authToken: context.state.authToken,
        user: context.state.user,
      });
    })
    .get('/auth/secure', middleware.auth(), context => {
      context.success('Access granted!');
    })
    .get('/auth/insecure', context => {
      context.success('Welcome guest!');
    })
    .get(
      '/auth/validateQuery',
      middleware.validate.query({
        required: ['foo', 'bar'],
        properties: {
          foo: { type: 'string', minLength: 2 },
          bar: { type: 'number' },
        },
      }),
      context => {
        context.success(context.request.query);
      },
    )
    .post(
      '/auth/validateBody',
      middleware.validate.body({
        required: ['foo', 'bar'],
        properties: {
          foo: { type: 'string', minLength: 2 },
          bar: { type: 'number' },
        },
      }),
      context => {
        context.success(context.request.body);
      },
    );
};
