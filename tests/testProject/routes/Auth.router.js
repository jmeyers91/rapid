module.exports = rapid => {
  const { userController } = rapid.controllers;
  const { middleware } = rapid;
  const loginUser = userController.login.bind(userController);

  return new rapid.Router()
    .post('/auth/login', middleware.login(loginUser), context => {
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
    .get('/auth/secure-with-model-mutate', middleware.auth(), async context => {
      const userId = context.state.user.id;
      const { User } = rapid.models;
      await User.query()
        .patch({ name: 'CHANGED' })
        .where('id', userId);
      context.success();
    })
    .get('/auth/secure-with-model-delete', middleware.auth(), async context => {
      const userId = context.state.user.id;
      const { User } = rapid.models;
      await User.query()
        .delete()
        .where('id', userId);
      context.success();
    })
    .get(
      '/auth/secure-with-model',
      middleware.auth(rapid.models.User),
      context => {
        context.success({ user: context.state.user });
      },
    )
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
