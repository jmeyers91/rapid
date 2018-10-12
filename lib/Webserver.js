const availableTestPorts =
  process.env.NODE_ENV === 'test'
    ? Array.from({ length: 30000 }).map((_, i) => 30000 + i)
    : null;

module.exports = rapid => {
  const Configurable = require('./Configurable');
  const { isTest } = rapid;

  return class Webserver extends Configurable {
    get defaultConfig() {
      return {
        port: 9090,
        cors: false,
        publicPath: 'public',
        publicPaths: [],
        jwt: {}
      };
    }

    constructor() {
      super(...arguments);
      if (!this.config.jwt.secret) {
        this.config.jwt.secret = this._loadSecret();
      }
      if (isTest) {
        if (!availableTestPorts.length)
          throw new Error(`No available test ports`);
        const portIndex = Math.floor(Math.random() * availableTestPorts.length);
        const port = availableTestPorts[portIndex];
        availableTestPorts.splice(portIndex, 1);
        this.config.port = port;
      }
    }

    // Loads the secret from a .jwtsecret file. Generates one if it doesn't exist.
    _loadSecret() {
      if (!this._secret) {
        const readOrCreateFile = require('./utils/readOrCreateFile');
        const secretFilePath = rapid.localPath('.jwtsecret');
        this._secret = readOrCreateFile.sync(
          secretFilePath,
          require('uuid/v4')
        );
      }
      return this._secret;
    }

    // Handles uncaught errors thrown by webserver middleware/endpoints
    async _errorMiddleware(context, next) {
      try {
        await next();
      } catch (error) {
        rapid.log(error);
        context.status = error.status || 500;

        // Avoid leaking data through uncaught errors in production.
        if (rapid.env === 'production' && context.status === 500) {
          context.body = { error: { message: 'Internal server error.' } };
        } else {
          context.body = { error: { message: error.message } };
        }
      }
    }

    // Logs requests
    async _loggingMiddleware(context, next) {
      await next();
      const { method, url } = context.request;
      const { status, message } = context.response;
      rapid.log(`${status} ${method} ${url} - ${message}`);
    }

    // Creates the webserver and adds middleware/endpoints
    async start() {
      const Koa = require('koa');
      const bodyParser = require('koa-bodyparser');
      const koaApp = (this.koaApp = new Koa());

      let { publicPath, publicPaths } = this.config;

      if(publicPath) addPublicDir(publicPath);
      if(publicPaths) publicPaths.forEach(addPublicDir);

      koaApp.use(this._loggingMiddleware.bind(this));
      koaApp.use(this._errorMiddleware.bind(this));
      koaApp.use(bodyParser());
      if (this.config.cors) {
        koaApp.use(require('@koa/cors')());
      }

      function addPublicDir(publicPath) {
        const serveStatic = require('koa-static');
        const fullPublicPath = rapid.localPath(publicPath);
        koaApp.use(serveStatic(fullPublicPath));
      }
    }

    // Disconnects the webserver
    async stop() {
      if (this._server) {
        await new Promise((resolve, reject) => {
          this._server.close(error => (error ? reject(error) : resolve()));
        });
        rapid.log(`Server disconnected`);
        if (isTest) {
          const { port } = this.config;
          availableTestPorts.push(port);
        }
      }
    }

    // Begin listening to incoming requests
    async listen() {
      this._server = this.koaApp.listen(this.config.port);
      rapid.log(`Listening on port ${this.config.port}`);
    }
  };
};
