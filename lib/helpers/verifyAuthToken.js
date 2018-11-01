const jwt = require('jsonwebtoken');

module.exports = rapid => function verifyAuthToken(authToken) {
  return new Promise((resolve, reject) => {
    const { secret } = rapid.webserver;
    authToken = authToken.replace(/^Bearer\s+/, '');
    jwt.verify(authToken, secret, (error, payload) => {
      if(error) {
        reject(error);
      } else {
        const { data, expires } = payload;

        if(!data || !expires) {
          const error = new Error('Invalid auth token format');
          error.status = 401;
          reject(error);
        } else if(expires < Date.now()) {
          const error = new Error('Authenticated session expired');
          error.status = 401;
          reject(error);
        } else {
          resolve(data);
        }
      }
    });
  });
};
