jest.setTimeout(60000);
const { rapidTest } = require('./testUtils');

describe('login middleware', () => {
  rapidTest(
    'Should respond with 200 if the username/password are correct',
    async rapid => {
      const response = await rapid.axios.post('/api/auth/login', {
        username: 'user',
        password: 'secret',
      });

      expect(response.status).toEqual(200);
    },
  );

  rapidTest(
    'Should respond with an auth token if the username/password are correct',
    async rapid => {
      const response = await rapid.axios.post('/api/auth/login', {
        username: 'user',
        password: 'secret',
      });

      expect(response.data.authToken).toBeTruthy();
    },
  );

  rapidTest(
    'Should respond with 401 if the username is incorrect',
    async rapid => {
      const response = await rapid.axios.post('/api/auth/login', {
        username: 'wrongusername',
        password: 'secret',
      });

      expect(response.status).toEqual(401);
    },
  );

  rapidTest(
    'Should respond with 401 if the password is incorrect',
    async rapid => {
      const response = await rapid.axios.post('/api/auth/login', {
        username: 'user',
        password: 'wrongpassword',
      });

      expect(response.status).toEqual(401);
    },
  );

  rapidTest(
    'Should respond with 400 if the username is missing',
    async rapid => {
      const response = await rapid.axios.post('/api/auth/login', {
        password: 'secret',
      });

      expect(response.status).toEqual(400);
    },
  );

  rapidTest(
    'Should respond with 400 if the password is missing',
    async rapid => {
      const response = await rapid.axios.post('/api/auth/login', {
        username: 'user',
      });

      expect(response.status).toEqual(400);
    },
  );
});

describe('auth middleware', () => {
  rapidTest(
    'Should respond with 200 if a valid auth token is passed',
    async rapid => {
      const loginResponse = await rapid.axios.post('/api/auth/login', {
        username: 'user',
        password: 'secret',
      });
      const { authToken } = loginResponse.data;
      const response = await rapid.axios.get('/api/auth/secure', {
        headers: {
          Authorization: authToken,
        },
      });
      expect(response.status).toEqual(200);
    },
  );

  rapidTest(
    'Should respond with 401 if an invalid auth token is passed',
    async rapid => {
      const response = await rapid.axios.get('/api/auth/secure', {
        headers: {
          Authorization: 'notavalidauthtoken',
        },
      });
      expect(response.status).toEqual(401);
    },
  );

  rapidTest(
    'Should respond with 401 if no auth token is passed',
    async rapid => {
      const response = await rapid.axios.get('/api/auth/secure', {
        headers: {
          Authorization: null,
        },
      });
      expect(response.status).toEqual(401);
    },
  );

  rapidTest(
    'Should use up-to-date model if Model option is passed',
    async rapid => {
      const loginResponse = await rapid.axios.post('/api/auth/login', {
        username: 'user',
        password: 'secret',
      });
      const { authToken } = loginResponse.data;
      await rapid.axios.get('/api/auth/secure-with-model-mutate', {
        headers: {
          Authorization: authToken,
        },
      });
      const response = await rapid.axios.get('/api/auth/secure-with-model', {
        headers: {
          Authorization: authToken,
        },
      });

      expect(response.data.user.name).toEqual('CHANGED');
    },
  );
});

describe('validate query middleware', () => {
  rapidTest(
    'Should respond with 200 if valid query parameters are passed',
    async rapid => {
      const response = await rapid.axios.get(
        '/api/auth/validateQuery?foo=somestring&bar=10',
      );
      expect(response.status).toEqual(200);
    },
  );

  rapidTest('Should coerce query types', async rapid => {
    const response = await rapid.axios.get(
      '/api/auth/validateQuery?foo=somestring&bar=10',
    );
    expect(response.data).toEqual({
      foo: 'somestring',
      bar: 10,
    });
  });

  rapidTest(
    'Should respond with 400 if invalid query parameters are passed',
    async rapid => {
      const response = await rapid.axios.get(
        '/api/auth/validateQuery?foo=somestring',
      );
      expect(response.status).toEqual(400);
    },
  );

  rapidTest(
    'Should respond with an error if invalid query parameters are passed',
    async rapid => {
      const response = await rapid.axios.get(
        '/api/auth/validateQuery?foo=somestring',
      );
      expect(response.data.error).toBeTruthy();
    },
  );
});

describe('validate body middleware', () => {
  rapidTest(
    'Should respond with 200 if valid body parameters are passed',
    async rapid => {
      const response = await rapid.axios.post('/api/auth/validateBody', {
        foo: 'somestring',
        bar: 10,
      });
      expect(response.status).toEqual(200);
    },
  );

  rapidTest(
    'Should respond with 400 if invalid body parameters are passed',
    async rapid => {
      const response = await rapid.axios.post('/api/auth/validateBody', {
        foo: 'somestring',
      });
      expect(response.status).toEqual(400);
    },
  );

  rapidTest(
    'Should respond with an error if invalid body parameters are passed',
    async rapid => {
      const response = await rapid.axios.post('/api/auth/validateBody', {
        foo: 'somestring',
      });
      expect(response.data.error).toBeTruthy();
    },
  );

  rapidTest(
    'socketAuth should allow users with valid auth tokens',
    async rapid => {
      const loginResponse = await rapid.axios.post('/api/auth/login', {
        username: 'user',
        password: 'secret',
      });
      const { authToken } = loginResponse.data;
      const socket = rapid.io('/protectedTestNamespace', {
        query: { authToken },
      });

      await new Promise((resolve, reject) => {
        socket.on('protectedTestNamespaceEventSuccess', () => {
          resolve();
        });
        socket.emit('protectedTestNamespaceEvent');
        setTimeout(() => reject(new Error('Took too long')), 5000);
      });
    },
  );

  rapidTest(
    'socketAuth should not allow users without auth tokens',
    async rapid => {
      const socket = rapid.io('/protectedTestNamespace');

      await new Promise((resolve, reject) => {
        socket.on('connect', () => reject('Should not be able to connect'));
        socket.on('error', error => {
          if (error === 'Authentication error') resolve();
          else reject(new Error('Wrong error: ' + error));
        });
      });
    },
  );

  rapidTest(
    'socketAuth should not allow users with invalid auth tokens',
    async rapid => {
      const socket = rapid.io('/protectedTestNamespace', {
        query: {
          authToken: 'some invalid auth token',
        },
      });

      await new Promise((resolve, reject) => {
        socket.on('connect', () => reject('Should not be able to connect'));
        socket.on('error', error => {
          if (error === 'Authentication error') resolve();
          else reject(new Error('Wrong error: ' + error));
        });
      });
    },
  );
});
