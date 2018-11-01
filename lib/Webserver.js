module.exports = rapid => {
  const Configurable = require('./Configurable');
  const readOrCreateFile = require('./utils/readOrCreateFile');
  const { month } = require('./utils/intervals');

  // Loads the secret from a .jwtsecret file. Generates one if it doesn't exist.
  function loadSecret() {
    return readOrCreateFile.sync(
      rapid.localPath('.jwtsecret'),
      require('uuid/v4'),
    );
  }

  return class Webserver extends Configurable {
    get defaultConfig() {
      return {
        port: 9090,
        cors: false,
        publicPath: 'public',
        publicPaths: [],
        jwt: {},
      };
    }

    constructor() {
      super(...arguments);
      const { jwt } = this.config;
      this.secret = (jwt && jwt.secret) || loadSecret();
      this.jwtDuration = (jwt && jwt.maxDuration) || (1 * month); // default token life to 1 month
    }

    // Handles uncaught errors thrown by webserver middleware/endpoints
    async _errorMiddleware(context, next) {
      try {
        await next();
      } catch (error) {
        context.fail(error);
      }
    }

    // Logs requests
    async _loggingMiddleware(context, next) {
      await next();
      const { method, url } = context.request;
      const { status, message } = context.response;
      rapid.log(`${status} ${method} ${url} - ${message}`);
    }

    async _envelopeMiddleware(context, next) {
      context.success = body => {
        context.response.body = body;
      };
      context.fail = (error, status) => {
        rapid.log(error);
        context.status = status || error.status || 500;

        // Avoid leaking data through uncaught errors in production.
        if (rapid.env === 'production' && context.status === 500) {
          context.body = {
            error: { message: 'Internal server error.', data: error.data },
          };
        } else {
          context.body = {
            error: { message: error.message, data: error.data },
          };
        }
      };
      await next();
    }

    // Handles 'auto', 'any', or array config port values
    // Adds a `resolvedPort` property to the webserver
    // If the port has already been resolved it is returned immedietely
    async resolvePort() {
      if(this.resolvedPort) return this.resolvedPort;

      const { port } = this.config;

      if (port === 'any' || port === 'auto') {
        // Find any available port
        this.resolvedPort = await require('get-port')();
      } else if (Array.isArray(port)) {
        // Find any available port with a preference for the ports passed
        this.resolvedPort = await require('get-port')(port);
      } else {
        this.resolvedPort = port;
      }
    }

    // Creates the webserver and adds middleware/endpoints
    async start() {
      await this.resolvePort();

      const Koa = require('koa');
      const bodyParser = require('koa-bodyparser');
      const Http = require('http');
      const koaApp = (this.koaApp = new Koa());

      this.httpServer = Http.createServer(koaApp.callback());
      
      let { publicPath, publicPaths } = this.config;
      
      await rapid._hookEmit('middlewareWillAttach');
      if (publicPath) addPublicDir(publicPath);
      if (publicPaths) publicPaths.forEach(addPublicDir);

      koaApp.use(this._envelopeMiddleware.bind(this));
      koaApp.use(this._loggingMiddleware.bind(this));
      koaApp.use(this._errorMiddleware.bind(this));
      koaApp.use(bodyParser());
      if (this.config.cors) {
        koaApp.use(require('@koa/cors')());
      }
      await rapid._hookEmit('middlewareDidAttach');

      function addPublicDir(publicPath) {
        const serveStatic = require('koa-static');
        const fullPublicPath = rapid.localPath(publicPath);
        koaApp.use(serveStatic(fullPublicPath));
      }
    }

    // Disconnects the webserver
    async stop() {
      if (this.httpServer) {
        await new Promise((resolve, reject) => {
          this.httpServer.close(error => (error ? reject(error) : resolve()));
        });
        rapid.log(`Server disconnected`);
      }
    }

    // Resolve port and begin listening to incoming requests
    async listen() {
      const { resolvedPort } = this;
      this.httpServer.listen(resolvedPort);
      rapid.log(`Listening on port ${resolvedPort}`);
    }
  };
};
