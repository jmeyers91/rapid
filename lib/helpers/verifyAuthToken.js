const jwt = require('jsonwebtoken');

module.exports = rapid => function verifyAuthToken(authToken) {
  return new Promise((resolve, reject) => {
    const { secret } = rapid.webserver;
    authToken = authToken.replace(/^Bearer\s+/, '');
    jwt.verify(authToken, secret, (error, payload) => {
      if(error) {
        reject(error);
      } else {
        resolve(payload);
      }
    });
  });
};
