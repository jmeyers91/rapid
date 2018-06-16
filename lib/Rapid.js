const path = require('path');
const { EventEmitter } = require('events');
const merge = require('lodash/merge');
const camelCase = require('lodash/camelCase');
const globby = require('globby');
const { existsSync } = require('fs');

module.exports = class Rapid extends EventEmitter {
  constructor(root, config={}) {
    super();
    this.config = config;
    this.root = root;
    this._coreModules = [];
    this.models = {};
    this.controllers = {};
    this.env = process.env.NODE_ENV || 'DEVELOPMENT';

    this.database = this._initCoreModule('./Database', this.config.database);
    this.webserver = this._initCoreModule('./Webserver', this.config.webserver);
    this.orm = this._initCoreModule('./Orm', this.config.orm);
    this.Router = require('koa-router');
    this.middleware = {
      auth: require('./middleware/auth')(this),
      login: require('./middleware/login')(this),
    };
  }

  log(v, ...rest) {
    console.log(v, ...rest);
    return v;
  }

  localPath(p) {
    return path.join(this.root, p);
  }

  relativePath(p) {
    return path.relative(this.root, p);
  }

  globby(patterns, options) {
    patterns = [].concat(patterns);
    return globby(patterns.map(p => path.join(this.root, p)), options);
  }

  addConfig(config) {
    if(config) this.mergeConfig(config);
    return this;
  }

  addModel(Model) {
    if(typeof Model !== 'function') throw new Error('Model is not a class');
    this.models[Model.name] = Model;
    return this;
  }

  addController(Controller) {
    if(typeof Controller !== 'function') throw new Error('Controller is not a class');
    const controller = new Controller();
    this.controllers[camelCase(Controller.name)] = controller;
    return this;
  }

  addRouter(router) {
    if(typeof router !== 'object') throw new Error('router is not an object');
    this.use(router.routes());
    this.use(router.allowedMethods());
    return this;
  }

  use(...args) {
    this.webserver.koaApp.use(...args);
  }

  _initCoreModule(requireStr, config) {
    const CoreModule = require(requireStr);
    if(!CoreModule) return;
    const coreModule = new CoreModule(this, config);
    this._coreModules.push(coreModule);
    return coreModule;
  }

  async start(fn) {
    for(let coreModule of this._coreModules) {
      try {
        await coreModule.start();
      } catch(error) {
        this.log(`Failed to start ${coreModule.name}`, error);
      }
    }

    process.once('SIGUSR2', async () => {
      await this.stop();
      process.kill(process.pid, 'SIGUSR2');
    });

    if(fn) await fn(this);
    await this.webserver.listen();

    return this;
  }

  async stop() {
    for(let coreModule of this._coreModules) {
      try {
        await coreModule.stop();
      } catch(error) {
        console.log(`Failed to stop ${coreModule.name}`, error);
      }
    }
  }
};
