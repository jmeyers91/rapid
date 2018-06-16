const jwt = require('jsonwebtoken');

module.exports = rapid => resolveUser => {
  if(!resolveUser) throw new Error(`rapid.middleware.login requires a user resolver function.`);
  return async (context, next) => {
    const { username, password } = context.request.body;
    let user;
    try {
      user = await resolveUser({ username, password });
    } catch(error) {
      context.response.status = 500;
      context.response.body = {error: error.message};
      return;
    }
    if(user) {
      const authToken = 'Bearer ' + jwt.sign(user.toJSON ? user.toJSON() : user, rapid.webserver.config.jwt.secret);
      context.state.authToken = authToken;
      context.state.user = user;
      return next();
    } else {
      context.response.status = 401;
      context.response.body = {error: 'Invalid username or password.'};
      return;
    }
  };
};
