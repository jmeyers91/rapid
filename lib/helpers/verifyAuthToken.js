const jwt = require('jsonwebtoken');

module.exports = rapid => function verifyAuthToken(authToken) {
  return new Promise((resolve, reject) => {
    const { secret } = rapid;
    authToken = authToken.replace(/^Bearer\s+/, '');
    jwt.verify(authToken, secret, (error, payload) => {
      if(error) {
        reject(error);
      } else {
        const exp = payload.exp * 1000; // convert from seconds to milliseconds

        if(!exp) {
          const error = new Error('Invalid auth token format');
          error.status = 401;
          reject(error);
        } else if(exp < Date.now()) {
          const error = new Error('Authenticated session expired');
          error.status = 401;
          reject(error);
        } else {
          resolve(payload);
        }
      }
    });
  });
};
