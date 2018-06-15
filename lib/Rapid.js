const path = require('path');
const merge = require('lodash/merge');
const camelCase = require('lodash/camelCase');
const globby = require('globby');
const Configurable = require('./Configurable');
const { existsSync } = require('fs');

module.exports = class Rapid extends Configurable {
  constructor(root, ...configs) {
    super(...configs);
    this.root = root;
    this._coreModules = [];
    this.models = {};
    this.controllers = {};
    this.env = process.env.NODE_ENV || 'DEVELOPMENT';
    this._resolveConfig();
    this.database = this._initCoreModule('./Database', this.config.database);
    this.webserver = this._initCoreModule('./Webserver', this.config.webserver);
    this.orm = this._initCoreModule('./Orm', this.config.orm);
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

  _resolveConfig() {
    const loadConfig = p => {
      const fullPath = this.localPath(p);
      if(existsSync(fullPath)) return require(fullPath);
      return null;
    };
    const defaultConfig = loadConfig('config/config.default.js');
    const envConfig = (
      loadConfig(`config/config.${this.env.toLowerCase()}.js`) || 
      loadConfig(`config/config.js`)
    );
    this.config = merge({}, defaultConfig, envConfig, this.config)
  }

  async _resolveModels() {
    return this._resolveRootExtension('model', 'models/**/*.model.js', modelFn => {
      this.addModel(modelFn(this));
    });
  }

  async _resolveControllers() {
    return this._resolveRootExtension('controller', 'controllers/**/*.controller.js', controllerFn => {
      this.addController(controllerFn(this));
    });
  }

  async _resolveApi() {
    return this._resolveRootExtension('router', 'routers/**/*.router.js', routerFn => {
      this.addRouter(routerFn(this))
    });
  }

  async _resolveRootExtension(name, patterns, fn) {
    for(let p of await this.globby(patterns)) {
      try {
        fn(require(p));
        this.log(`Resolved ${name} ${this.relativePath(p)}`)
      } catch(error) {
        this.log(`Failed to resolve ${name} "${p}":`, error);
      }
    }
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

    await this._resolveModels();
    await this._resolveControllers();
    await this._resolveApi();
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
