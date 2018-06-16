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
    this.api.use(router.routes());
    this.api.use(router.allowedMethods());
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

    if(this._moduleLoader) await this._moduleLoader(this);
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
