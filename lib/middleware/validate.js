module.exports = rapid => {
  const Ajv = require('ajv');

  return {
    query(schema, options = {}) {
      schema = Object.assign({}, schema, { $async: true });
      options = Object.assign({ coerceTypes: true }, options);
      const ajv = new Ajv(options);
      const validate = ajv.compile(schema);

      return async (context, next) => {
        try {
          await validate(context.request.query);
        } catch (error) {
          if (!(error instanceof Ajv.ValidationError)) throw error;
          context.response.status = 400;
          context.response.body = {
            error: {
              message: error.errors[0].message,
              errors: error.errors
            }
          };
          return;
        }
        return next();
      };
    },

    body(schema, options = {}) {
      schema = Object.assign({}, schema, { $async: true });
      const ajv = new Ajv(options);
      const validate = ajv.compile(schema);

      return async (context, next) => {
        try {
          await validate(context.request.body);
        } catch (error) {
          if (!(error instanceof Ajv.ValidationError)) throw error;
          context.response.status = 400;
          context.response.body = {
            error: {
              message: error.errors[0].message,
              errors: error.errors
            }
          };
          return;
        }
        return next();
      };
    }
  };
};
