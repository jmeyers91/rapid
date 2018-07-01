module.exports = rapid => {
  const camelCase = require('lodash/camelCase');

  const getModelIdKey = Model => camelCase(Model.name) + 'Id';
  const getModelIdParam = (Model, context) => +context.params[getModelIdKey(Model)];

  function createMiddleware(Model) {
    return async (context, next) => {
      context.response.body = await Model.query().insert(context.request.body).returning('*');
      context.response.status = 200;
      return next();
    };
  };

  function readMiddleware(Model) {
    return async (context, next) => {
      const id = getModelIdParam(Model, context);
      context.response.body = await Model.query().where('id', id).first();
      context.response.status = 200;
      return next();
    };
  };

  function updateMiddleware(Model) {
    return async (context, next) => {
      const id = getModelIdParam(Model, context);
      context.response.body = await Model.query().patchAndFetchById(id, context.request.body);
      context.response.status = 200;
      return next();
    };
  };

  function deleteMiddleware(Model) {
    return async (context, next) => {
      const id = getModelIdParam(Model, context);
      await Model.query().delete().where('id', id).first();
      context.response.status = 200;
      return next();
    };
  };

  function indexMiddleware(Model) {
    return async (context, next) => {
      context.response.body = await Model.query();
      context.response.status = 200;
      return next();
    };
  };

  function resourceMiddleware(Model) {
    const modelName = camelCase(Model.name);
    const baseRoute = '/' + modelName;
    const individualRoute = baseRoute + '/:' + getModelIdKey(Model);

    return new rapid.Router()
      .get(baseRoute, indexMiddleware(Model))
      .post(baseRoute, createMiddleware(Model))
      .get(individualRoute, readMiddleware(Model))
      .post(individualRoute, updateMiddleware(Model))
      .delete(individualRoute, deleteMiddleware(Model));
  };

  return resourceMiddleware;
};