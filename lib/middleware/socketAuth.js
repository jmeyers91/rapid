module.exports = rapid => {
  const cookie = require('cookie');

  return function socketAuthMiddleware() {
    const { verifyAuthToken } = rapid.helpers;

    return async (socket, next) => {
      const { handshake } = socket;

      const headerAuthToken = handshake.query && handshake.query.authToken;
      const cookieAuthToken = !headerAuthToken &&
        handshake.headers.cookie &&
        cookie.parse(handshake.headers.cookie).authToken;

      const authToken = headerAuthToken || cookieAuthToken;

      if (authToken) {
        try {
          socket.user = await verifyAuthToken(authToken);
          next();
        } catch (error) {
          next(new Error('Authentication error'));
        }
      } else {
        next(new Error('Authentication error'));
      }
    };
  };
};
