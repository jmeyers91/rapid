const Core = require('./Core');

module.exports = class Webserver extends Core {
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
      const secretFilePath = this.rapid.localPath('.jwtsecret');
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
      this.log(error);
    }
  }

  async start() {
    const { rapid, config } = this;
    const Koa = require('koa');
    const bodyParser = require('koa-bodyparser');
    const Router = require('koa-router');
    const koaApp = this.koaApp = new Koa();

    koaApp.use(this._errorHandler.bind(this));
    koaApp.use(bodyParser());
  }

  async listen() {
    await this.koaApp.listen(this.config.port);
    this.log(`Listening on port ${this.config.port}`);
  }
};
