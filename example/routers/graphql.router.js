module.exports = rapid => {
  const { graph } = rapid;

  return new rapid.Router().post(
    '/graphql',
    rapid.middleware.auth(),
    rapid.middleware.graphql()
  );
};
