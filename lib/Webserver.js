module.exports = rapid => {
  const Configurable = require('./Configurable');
  const koaCors = require('@koa/cors');
  const { NODE_ENV } = process.env;

  async function loggerMiddleware(context, next) {
    await next();
    const { method, url } = context.request;
    const { status, message } = context.response;
    rapid.log(`${status} ${method} ${url} - ${message}`);
  }

  async function addUtilityFunctionsMiddleware(context, next) {
    context.success = body => {
      context.response.body = body;
    };

    context.fail = (error, status) => {
      rapid.log(error);
      context.status = status || error.status || 500;

      // Avoid leaking data through uncaught errors in production.
      if (NODE_ENV === 'production' && context.status === 500) {
        context.body = {
          error: { message: 'Internal server error.', data: error.data },
        };
      } else {
        context.body = {
          error: { message: error.message, data: error.data },
        };
      }
    };

    return next();
  }

  async function errorHandlerMiddleware(context, next) {
    try {
      await next();
    } catch (error) {
      context.fail(error);
    }
  }

  return class Webserver extends Configurable {
    get defaultConfig() {
      return {
        port: 9090,
        cors: false,
        publicPath: 'public',
        publicPaths: [],
      };
    }

    get secret() {
      return rapid.secret;
    }

    // Handles 'auto', 'any', or array config port values
    // Adds a `resolvedPort` property to the webserver
    // If the port has already been resolved it is returned immedietely
    async resolvePort() {
      if (this.resolvedPort) return this.resolvedPort;

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

      const Koa = (this.Koa = require('koa'));
      const bodyParser = require('koa-bodyparser');
      const Http = require('http');
      const koaApp = (this.koaApp = new Koa());

      this.httpServer = Http.createServer(koaApp.callback());

      let { publicPath, publicPaths } = this.config;

      await rapid._hookEmit('middlewareWillAttach');
      if (publicPath) addPublicDir(publicPath);
      if (publicPaths) publicPaths.forEach(addPublicDir);

      koaApp.use(errorHandlerMiddleware);
      koaApp.use(addUtilityFunctionsMiddleware);
      koaApp.use(loggerMiddleware);
      koaApp.use(bodyParser());

      if (this.config.cors) {
        koaApp.use(koaCors());
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
