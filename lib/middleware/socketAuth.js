module.exports = rapid => {
  return function socketAuthMiddleware() {
    const { verifyAuthToken } = rapid.helpers;

    return async (socket, next) => {
      const authToken = socket.handshake.query && socket.handshake.query.authToken;
      if (authToken) {
        try {
          socket.user = await verifyAuthToken(authToken);
          next();
        } catch(error) {
          next(new Error('Authentication error'));
        }
      } else {
        next(new Error('Authentication error'));
      }    
    };
  };
};
