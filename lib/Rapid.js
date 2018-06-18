const path = require('path');
const { EventEmitter } = require('events');
const camelCase = require('lodash/camelCase');
const bcrypt = require('bcrypt');
const nodeCleanup = require('node-cleanup');

class Rapid extends EventEmitter {
  constructor(root, config={}) {
    super();
    this.env = process.env.NODE_ENV || 'DEVELOPMENT';
    this.config = config;
    this.root = root;
    this._coreModules = [];
    this._modelFns = [];
    this._controllerFns = [];
    this._routerFns = [];

    const Database = require('./Database')(this);
    const Webserver = require('./Webserver')(this);
    const Router = require('./Router')(this);
    
    this.database = new Database(config.database);
    this.webserver = new Webserver(config.webserver);
    this.Router = Router;
    
    this.models = {};
    this.controllers = {};
    this.api = new Router({prefix: '/api'});
    this.middleware = require('./middleware')(this);

    this.verifyPassword = (password, hash) => bcrypt.compare(password, hash);
    this.hashPassword = password => bcrypt.hash(password, 10);

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
    Object.assign(this.config, ...configs);
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
      if(Model) {
        this.models[Model.name] = Model;
        this.log(`Resolved model ${Model.name}`);
      }
    }
  }

  async _resolveControllers() {
    for(let controllerFn of this._controllerFns) {
      const Controller = controllerFn(this);
      if(Controller) {
        const name = camelCase(Controller.name);
        this.controllers[name] = new Controller();
        this.log(`Resolved controller ${name}`);
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
    if(this._routerFns.length) this.log(`Resolved API`);
  }

  use(...args) {
    this.webserver.koaApp.use(...args);
  }

  async start() {
    nodeCleanup(() => this.stop());

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

Rapid.autoload = require('./autoload').bind(null, Rapid);

module.exports = Rapid;
