
module.exports = rapid => {
  const Configurable = require('./Configurable');
  const gracefulShutdown = require('http-graceful-shutdown');

  return class Webserver extends Configurable {
    get defaultConfig() {
      return {
        port: 9090,
        jwt: {}
      };
    }

    constructor() {
      super(...arguments);
      if(!this.config.jwt.secret) {
        this.config.jwt.secret = this._loadSecret();
      }
    }

    _loadSecret() {
      if(!this._secret) {
        const readOrCreateFile = require('./utils/readOrCreateFile');
        const secretFilePath = rapid.localPath('.jwtsecret');
        this._secret = readOrCreateFile.sync(secretFilePath, require('uuid/v4'));
      }
      return this._secret;
    }

    async _errorHandler(context, next) {
      try {
        await next();
      } catch (error) {
        context.status = error.status || 500;
        context.body = error.message;
        rapid.log(error);
      }
    }

    async start() {
      const { config } = this;
      const Koa = require('koa');
      const bodyParser = require('koa-bodyparser');
      const Router = require('koa-router');
      const koaApp = this.koaApp = new Koa();

      koaApp.use(this._errorHandler.bind(this));
      koaApp.use(bodyParser());
    }

    async stop() {
      if(this._server) {
        await gracefulShutdown(this._server);
        rapid.log(`Server disconnected`);
      }
    }

    async listen() {
      this._server = this.koaApp.listen(this.config.port);
      rapid.log(`Listening on port ${this.config.port}`);
    }
  };
};
