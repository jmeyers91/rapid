
module.exports = rapid => {
  return new rapid.Router()
    .get('/discoverTestRouter', context => {
      context.response.status = 200;
    });
};
