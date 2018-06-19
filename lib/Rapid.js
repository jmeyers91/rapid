const path = require('path');
const isFunction = require('lodash/isFunction');
const camelCase = require('lodash/camelCase');
const nodeCleanup = require('node-cleanup');

class Rapid {
  constructor(root, config) {
    this.env = process.env.NODE_ENV || 'development';
    this.root = root;
    this.config = {};
    if(config) this.addConfigs(config);

    this.flags = {};
    this._addedConfigs = [];
    this._addedModels = [];
    this._addedControllers = [];
    this._addedRouters = [];
    this._addedSeeds = [];
    this.models = {};
    this.controllers = {};
    
    this.helpers = require('./helpers')(this);
    this.middleware = require('./middleware')(this);
    this.log = this.log.bind(this);
  }

  get discover() {
    if(!this._discover) {
      const Discover = require('./Discover')(this);
      this._discover = new Discover();
    }
    return this._discover;
  }

  flag(key, value=true) {
    this.flags[key] = true;
    return this;
  }

  clear() { return this.flag('clear'); }

  migrate() { return this.flag('migrate'); }

  seed() { return this.flag('seed'); }

  rollback() { return this.flag('rollback'); }

  log(v, ...rest) {
    console.log(v, ...rest);
    return v;
  }

  localPath(p) {
    if(path.isAbsolute(p)) return p;
    return path.join(this.root, p);
  }

  relativePath(p) {
    return path.relative(this.root, p);
  }

  addConfigs(...configs) {
    this._addedConfigs.push(...configs);
    return this;
  }

  addModels(...models) {
    this._addedModels.push(...models);
    return this;
  }

  addControllers(...controllers) {
    this._addedControllers.push(...controllers);
    return this;
  }

  addRouters(...routers) {
    this._addedRouters.push(...routers);
    return this;
  }

  addSeeds(...seeds) {
    this._addedSeeds.push(...seeds);
    return this;
  }

  _resolveConfigs() {
    Object.assign(this.config, 
      ...this._addedConfigs.map(config => 
        isFunction(config)
          ? config(this)
          : config
      )
    );
  }

  _resolveModels() {
    for(let modelDef of this._addedModels) {
      const Model = isFunction(modelDef) && modelDef(this);
      if(Model) {
        this.models[Model.name] = Model;
        this.log(`Resolved model ${Model.name}`);
      }
    }
  }

  _resolveControllers() {
    for(let controllerDef of this._addedControllers) {
      const Controller = isFunction(controllerDef) && controllerDef(this);
      if(Controller) {
        const name = camelCase(Controller.name);
        this.controllers[name] = new Controller();
        this.log(`Resolved controller ${name}`);
      }
    }
  }

  _resolveRouters() {
    let routerAdded = false;
    for(let routerDef of this._addedRouters) {
      const router = isFunction(routerDef) && routerDef(this);
      if(router) {
        this.api.use(router.routes());
        this.api.use(router.allowedMethods());
        routerAdded = true;
      }
    }
    if(routerAdded) this.log(`Resolved API`);
  }

  async _runSeeds() {
    for(let seed of this._addedSeeds) {
      if(seed && isFunction(seed)) {
        await seed(this);
        this.log(`Ran seed ${seed.name}`);
      }
    }
  }

  use(...args) {
    this.webserver.koaApp.use(...args);
  }

  async start() {
    nodeCleanup(() => this.stop());
    await this._resolveConfigs();
    
    const Database = require('./Database')(this);
    const Webserver = require('./Webserver')(this);
    const Router = require('./Router')(this);
    
    this.database = new Database(this.config.database);
    this.webserver = new Webserver(this.config.webserver);
    this.Router = Router;
    this.api = new Router({prefix: '/api'});
    
    const { flags } = this;

    if(flags.clear) await this.database.clear();

    await this.database.start();
    await this.webserver.start();

    if(flags.rollback) await this.database.rollback();
    if(flags.migrate) await this.database.migrate();

    if(this._discover) await this._discover.queue;
    await this._resolveModels();
    await this._resolveControllers();
    await this._resolveRouters();

    if(flags.seed) await this._runSeeds();

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
