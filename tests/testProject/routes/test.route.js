module.exports = rapid =>
  rapid.api.get('/route/test', context => {
    context.response.body = {
      success: true
    };
    context.response.status = 200;
  });
