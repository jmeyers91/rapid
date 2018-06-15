const Core = require('./Core');
const Koa = require('koa');
const Router = require('koa-router');

module.exports = class Webserver extends Core {
  get defaultConfig() {
    return {
      port: 9090,
    };
  }

  async start() {
    const { rapid, config } = this;
    const koaApp = this.koaApp = new Koa();
    rapid.Router = Router;
  }

  stop() {
    if(this.koaApp) {
      this.koaApp.close();
      this.log('Closed webserver');
    }
  }

  async listen() {
    await this.koaApp.listen(this.config.port);
    this.log(`Listening on port ${this.config.port}`);
  }
};
