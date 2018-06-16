
module.exports = rapid => {
  const users = [
    {username: 'jim', password: 'secret', age: 26},
    {username: 'sarah', password: 'hasra', age: 23},
  ];

  async function loginUser(credentials) {
    return users.find(user =>
      user.username === credentials.username &&
      user.password === credentials.password
    );
  }

  return new rapid.Router()
    .post('/api/auth/login', rapid.middleware.login(loginUser), context => {
      console.log('authToken:', context.state.authToken);
      context.response.body = {
        authToken: context.state.authToken,
        user: context.state.user,
      };
      context.response.status = 200;
    })
    .get('/api/auth/secure', rapid.middleware.auth(), context => {
      context.response.body = 'Success';
    })
    .get('/api/auth/insecure', context => {
      context.response.body = 'Success';
    });
};

