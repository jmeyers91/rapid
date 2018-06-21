
module.exports = rapid => {
  console.log('discoverTestFiles');
  global._discoverTestRouterResolved = true;
  return new rapid.Router()
    .get('/discoverTestRouter', context => {
      context.response.status = 200;
    });
};
