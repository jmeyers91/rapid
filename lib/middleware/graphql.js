module.exports = rapid => {
  const { graphql } = require('graphql');

  return () => async function graphqlMiddleware(context) {
    const result = await graphql(rapid.graphQlSchema, context.request.body.query, {
      onQuery(builder) {
        builder.mergeContext(context.state);
      }
    });
    context.response.body = result;
    context.response.status = 200;
  };
};
