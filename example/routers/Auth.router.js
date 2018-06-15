
module.exports = rapid => {
  return new rapid.Router()
    .post('/api/auth/login', (context, next) => {
      context.response.body = {success: true};
      return next();
    });
};
