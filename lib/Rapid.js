const path = require('path');
const EventEmitter = require('eventemitter3');
const isFunction = require('lodash/isFunction');
const flatten = require('lodash/flatten');
const identity = require('lodash/identity');
const camelCase = require('lodash/camelCase');
const nodeCleanup = require('node-cleanup');
const GraphqlSchemaBuilder = require('objection-graphql/lib/SchemaBuilder');
const chunkedAsync = require('./utils/chunkedAsync');
const chunkByRunOrder = require('./utils/chunkByRunOrder');

class Rapid extends EventEmitter {
  constructor(root, config) {
    super();
    this.env = process.env.NODE_ENV || 'development';
    this.root = root;
    this._config = {};
    if(config) this.addConfigs(config);

    this.flags = {};
    this._addedModels = [];
    this._addedControllers = [];
    this._addedRouters = [];
    this._addedSeeds = [];
    this._addedHooks = [];
    this._hooks = [];

    this.models = {};
    this.controllers = {};

    this.helpers = require('./helpers')(this);
    this.middleware = require('./middleware')(this);
    this.log = this.log.bind(this);
    
    const Discover = require('./Discover')(this);
    this.discover = new Discover();

    ['clear', 'migrate', 'seed', 'rollback'].forEach(flagName => {
      this[flagName] = this.flag.bind(this, flagName);
    });
  }

  flag(key) {
    this.flags[key] = true;
    return this;
  }

  log(v, ...rest) {
    if(this.env !== 'test') console.log(v, ...rest);
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
    Object.assign(this._config, ...configs);
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

  addHooks(...hooks) {
    this._addedHooks.push(...hooks);
    return this;
  }

  _resolveModels() {
    for(let modelDef of this._addedModels) {
      const Model = isFunction(modelDef) && modelDef(this);
      if(Model) {
        this.models[Model.name] = Model;
        this.log(`Resolved model ${Model.name}`);
      }
    }

    const graphqlSchemaBuilder = new GraphqlSchemaBuilder();
    for(let Model of Object.values(this.models)) {
      const pluralName = Model.pluralName || Model.tableName;
      const singularName = Model.singularName || pluralName.slice(0, -1);
      graphqlSchemaBuilder.model(Model, {
        fieldName: singularName,
        listFieldName: pluralName,
      });
    }
    this.graphQlSchema = graphqlSchemaBuilder.build();
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
    await chunkedAsync(
      chunkByRunOrder(this._addedSeeds),
      seedFn => seedFn(this)
    );
  }

  async _runHooks() {
    this._hooks = flatten(await chunkedAsync(
      chunkByRunOrder(this._addedHooks.filter(identity)),
      hook => {
        if(isFunction(hook)) return hook(this);
        return hook;
      }
    )).filter(identity);
  }

  async _hookEmit(eventKey) {
    for(let hook of this._hooks) {
      if(isFunction(hook[eventKey])) {
        await hook[eventKey](this);
      }
    }
    this.emit('@' + eventKey);
  }

  use(...args) {
    this.webserver.koaApp.use(...args);
  }

  autoload() {
    this.discover
      .configs('config/config.default.js', 'config/config.js')
      .models('models/**/*.model.js')
      .controllers('controllers/**/*.controller.js')
      .routers('routers/**/*.router.js')
      .seeds('seeds/**/*.seed.js')
      .hooks('hooks/**/*.hook.js');

    return this;
  }

  async stop() {
    await this._hookEmit('beforeStop');
    if(this.webserver) await this.webserver.stop();
    if(this.database) await this.database.stop();
    await this._hookEmit('stop');
  }

  async start() {
    nodeCleanup(() => this.stop());

    // Discover models, controllers, routers, seeds, hooks, in the app root
    await this.discover.run();

    // Attach app hooks
    await this._runHooks();
    await this._hookEmit('rapidWillStart');

    const config = this._config;
    const Database = require('./Database')(this);
    const Webserver = require('./Webserver')(this);
    const Router = require('./Router')(this);

    this.database = new Database(config.database);
    this.webserver = new Webserver(config.webserver);
    this.api = new Router({prefix: '/api'});
    this.Router = Router;

    const { flags } = this;

    if(flags.clear) {
      await this._hookEmit('databaseWillClear');
      await this.database.drop();
      await this._hookEmit('databaseDidClear');
    }

    await this._hookEmit('databaseWillStart');
    await this.database.start();
    await this._hookEmit('databaseDidStart');

    await this._hookEmit('webserverWillStart');
    await this.webserver.start();
    await this._hookEmit('webserverDidStart');

    if(flags.rollback) {
      await this._hookEmit('rollbackWillRun');
      await this.database.rollback();
      await this._hookEmit('rollbackDidRun');
    }

    if(flags.migrate) {
      await this._hookEmit('migrationsWillRun');
      await this.database.migrate();
      await this._hookEmit('migrationsDidRun');
    }

    await this._hookEmit('modelsWillAttach');
    await this._resolveModels();
    await this._hookEmit('modelsDidAttach');

    await this._hookEmit('controllersWillAttach');
    await this._resolveControllers();
    await this._hookEmit('controllersDidAttach');

    await this._hookEmit('routersWillAttach');
    await this._resolveRouters();
    this.use(this.api.routes());
    await this._hookEmit('routersDidAttach');

    if(flags.seed) {
      await this._hookEmit('seedsWillRun');
      await this._runSeeds();
      await this._hookEmit('seedsDidRun');
    }

    await this._hookEmit('webserverWillListen');
    await this.webserver.listen();
    await this._hookEmit('webserverDidListen');

    await this._hookEmit('rapidDidStart');

    return this;
  }
};

Rapid.test = require('./testWrapper');

module.exports = Rapid;
