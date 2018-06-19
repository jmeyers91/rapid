const path = require('path');
const identity = require('lodash/identity');
const isFunction = require('lodash/isFunction');
const camelCase = require('lodash/camelCase');
const nodeCleanup = require('node-cleanup');

class Rapid {
  constructor(root, config={}) {
    this.env = process.env.NODE_ENV || 'development';
    this.root = root;
    this.config = config;

    this._addedConfigs = [];
    this._addedModels = [];
    this._addedControllers = [];
    this._addedRouters = [];
    this.models = {};
    this.controllers = {};
    
    this.helpers = require('./helpers')(this);
    this.middleware = require('./middleware')(this);
    this.log = this.log.bind(this);
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

  relativeGlob(patterns, options) {
    const globby = require('globby');
    patterns = [].concat(patterns).map(p => this.localPath(p));
    return globby(patterns, options);
  }

  addConfigs(...configs) {
    this._addedConfigs.push(...configs);
    return this;
  }

  addModels(...modelFns) {
    this._addedModels.push(...modelFns);
    return this;
  }

  addControllers(...controllerFns) {
    this._addedControllers.push(...controllerFns);
    return this;
  }

  addRouters(...routerFn) {
    this._addedRouters.push(...routerFn);
    return this;
  }

  async _resolveModules(modules, fn) {
    for(let moduleResolver of modules) {
      const moduleResolverType = typeof moduleResolver;
      if(moduleResolverType === 'string') {
        await Promise.all(
          (await this.relativeGlob(moduleResolver))
            .map(modulePath => require(modulePath))
            .filter(identity)
            .map(fn)
        );
      } else if(moduleResolver) {
        await await fn(moduleResolver);
      }
    }
  }

  _resolveConfig() {
    return this._resolveModules(this._addedConfigs, config => {
      if(typeof config === 'object') {
        Object.assign(this.config, config);
      }
    });
  }

  _resolveModels() {
    return this._resolveModules(this._addedModels, modelFn => {
      const Model = isFunction(modelFn) && modelFn(this);
      if(Model) {
        this.models[Model.name] = Model;
        this.log(`Resolved model ${Model.name}`);
      }
    });
  }

  _resolveControllers() {
    return this._resolveModules(this._addedControllers, controllerFn => {
      const Controller = isFunction(controllerFn) && controllerFn(this);
      if(Controller) {
        const name = camelCase(Controller.name);
        this.controllers[name] = new Controller();
        this.log(`Resolved controller ${name}`);
      }
    });
  }

  async _resolveRouters() {
    let routerAdded = false;
    await this._resolveModules(this._addedRouters, routerFn => {
      const router = isFunction(routerFn) && routerFn(this);
      if(router) {
        this.api.use(router.routes());
        this.api.use(router.allowedMethods());
        routerAdded = true;
      }
    });
    if(routerAdded) this.log(`Resolved API`);
  }

  use(...args) {
    this.webserver.koaApp.use(...args);
  }

  async start() {
    nodeCleanup(() => this.stop());
    await this._resolveConfig();

    const Database = require('./Database')(this);
    const Webserver = require('./Webserver')(this);
    const Router = require('./Router')(this);

    this.database = new Database(this.config.database);
    this.webserver = new Webserver(this.config.webserver);
    this.Router = Router;
    this.api = new Router({prefix: '/api'});

    await this.database.start();
    await this.webserver.start();

    await this._resolveModels();
    await this._resolveControllers();
    await this._resolveRouters();

    this.use(this.api.routes());

    await this.webserver.listen();

    return this;
  }

  async stop() {
    await this.webserver.stop();
    await this.database.stop();
  }
};

module.exports = Rapid;
