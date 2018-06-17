const path = require('path');
const { EventEmitter } = require('events');
const camelCase = require('lodash/camelCase');
const bcrypt = require('bcrypt');

class Rapid extends EventEmitter {
  constructor(root, config={}) {
    super();
    this.config = config;
    this.root = root;
    this._coreModules = [];
    this._modelFns = [];
    this._controllerFns = [];
    this._routerFns = [];
    this._moduleLoader = null;

    this.models = {};
    this.controllers = {};
    this.env = process.env.NODE_ENV || 'DEVELOPMENT';
    this.database = this._initCoreModule('./Database', this.config.database);
    this.webserver = this._initCoreModule('./Webserver', this.config.webserver);
    this.Router = require('koa-router');
    this.api = new this.Router({prefix: '/api'});
    this.middleware = {
      auth: require('./middleware/auth')(this),
      login: require('./middleware/login')(this),
    };
    this.verifyPassword = (password, hash) => bcrypt.compare(password, hash);
    this.hashPassword = password => bcrypt.hash(password, 10);
    if(this.env === 'test') this.test();
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
    const globby = require('globby');
    patterns = [].concat(patterns).map(p => path.join(this.root, p));
    return globby(patterns, options);
  }

  addConfig(config) {
    if(config) this.mergeConfig(config);
    return this;
  }

  addModels(...modelFns) {
    this._modelFns.push(...modelFns);
    return this;
  }

  addControllers(...controllerFns) {
    this._controllerFns.push(...controllerFns);
    return this;
  }

  addRouters(...routerFn) {
    this._routerFns.push(...routerFn);
    return this;
  }

  async _resolveModels() {
    for(let modelFn of this._modelFns) {
      const Model = modelFn(this);
      if(Model) this.models[Model.name] = Model;
    }
  }

  async _resolveControllers() {
    for(let controllerFn of this._controllerFns) {
      const Controller = controllerFn(this);
      if(Controller) {
        this.controllers[camelCase(Controller.name)] = new Controller();
      }
    }
  }

  async _resolveRouters() {
    for(let routerFn of this._routerFns) {
      const router = routerFn(this);
      if(router) {
        this.api.use(router.routes());
        this.api.use(router.allowedMethods());
      }
    }
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

  async start() {
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

    await this._resolveModels();
    await this._resolveControllers();
    await this._resolveRouters();

    this.use(this.api.routes());

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

Rapid.autoload = require('./autoload').bind(null, Rapid);

module.exports = Rapid;
