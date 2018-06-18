const path = require('path');
const { EventEmitter } = require('events');
const camelCase = require('lodash/camelCase');
const bcrypt = require('bcrypt');

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

  addConfig(...configs) {
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

  async start() {
    process.once('SIGUSR2', async () => {
      await this.stop();
      process.kill(process.pid, 'SIGUSR2');
    });

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
