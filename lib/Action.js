module.exports = rapid => {
  return class Action {
    constructor(name) {
      this.name = name;
      this.validateFns = [];
      this.schemaObject = null;
      this.fn = null;
      this._routeFns = [];
    }

    schema(schemaObject) {
      const { ajv } = rapid;
      this.schemaObject = schemaObject;
      this.validateFns.push(ajv.compile({
        $async: true,
        ...schemaObject,
      }));
      return this;
    }

    validate(validateFn) {
      this.validateFns.push(validateFn);
      return this;
    }

    receiver(fn) {
      this.fn = fn;
      return this;
    }

    async run(props) {
      const { logActions } = rapid.config;
      if(logActions) console.time(`CALL ${this.name}`);

      const { fn, validateFns } = this;
      if(validateFns.length) {
        for(let validate of validateFns) {
          await validate(props);
        }
      }

      try {
        return await fn(props);
      } finally {
        if(logActions) console.timeEnd(`CALL ${this.name}`);
      }
    }

    _createRequestHandler(method) {
      if(method === 'post' || method === 'put') {
        return async context => {
          const props = Object.assign(
            {},
            context.params,
            context.request.query,
            context.request.body,
            context.state,
          );
          context.success(await this.run(props));
        };
      } else {
        return async context => {
          const props = Object.assign(
            {},
            context.params,
            context.request.query,
            context.state,
          );
          context.success(await this.run(props));
        };
      }
    }

    // Called after non-action routes are attached
    attachRoutes() {
      for(let routeFn of this._routeFns) {
        routeFn();
      }
    }

    getAuto(endpoint, ...middleware) {
      return this.get(endpoint, ...middleware, this._createRequestHandler('get'));
    }

    postAuto(endpoint, ...middleware) {
      return this.post(endpoint, ...middleware, this._createRequestHandler('post'));
    }

    putAuto(endpoint, ...middleware) {
      return this.put(endpoint, ...middleware, this._createRequestHandler('put'));
    }

    delAuto(endpoint, ...middleware) {
      return this.del(endpoint, ...middleware, this._createRequestHandler('del'));
    }

    get(...args) {
      this._routeFns.push(() => {
        rapid.api.get(...args);
      });
      return this;
    }

    post(...args) {
      this._routeFns.push(() => {
        rapid.api.post(...args);
      });
      return this;
    }

    put(...args) {
      this._routeFns.push(() => {
        rapid.api.put(...args);
      });
      return this;
    }

    del(...args) {
      this._routeFns.push(() => {
        rapid.api.del(...args);
      });
      return this;
    }
  };
};
