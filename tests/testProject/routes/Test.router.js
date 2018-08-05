module.exports = rapid => {
  return new rapid.Router().get('/test', context => {
    context.response.status = 200;
  });
};
