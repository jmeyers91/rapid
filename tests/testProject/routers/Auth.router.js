module.exports = rapid => {
  const { userController } = rapid.controllers;
  const { middleware } = rapid;
  const loginUser = userController.login.bind(userController);

  return new rapid.Router()
    .post('/auth/login', middleware.login(loginUser), context => {
      context.response.body = {
        authToken: context.state.authToken,
        user: context.state.user
      };
      context.response.status = 200;
    })
    .get('/auth/secure', middleware.auth(), context => {
      context.response.status = 200;
      context.response.body = 'Access granted!';
    })
    .get('/auth/insecure', context => {
      context.response.status = 200;
      context.response.body = 'Welcome guest!';
    })
    .get('/auth/validateQuery', 
      middleware.validate.query({
        required: ['foo', 'bar'],
        properties: {
          foo: { type: 'string', minLength: 2 },
          bar: { type: 'number' }
        }
      }),
      context => {
        context.response.status = 200;
        context.response.body = context.request.query
      }
    )
    .post('/auth/validateBody', 
      middleware.validate.body({
        required: ['foo', 'bar'],
        properties: {
          foo: { type: 'string', minLength: 2 },
          bar: { type: 'number' }
        }
      }),
      context => {
        context.response.status = 200;
        context.response.body = context.request.body
      }
    );
};
