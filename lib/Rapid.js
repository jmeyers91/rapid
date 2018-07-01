const path = require('path');
const isFunction = require('lodash/isFunction');
const camelCase = require('lodash/camelCase');
const nodeCleanup = require('node-cleanup');
const GraphqlSchemaBuilder = require('objection-graphql/lib/SchemaBuilder');

class Rapid {
  constructor(root, config) {
    this.env = process.env.NODE_ENV || 'development';
    this.root = root;
    this._config = {};
    if(config) this.addConfigs(config);

    this.flags = {};
    this._addedModels = [];
    this._addedControllers = [];
    this._addedRouters = [];
    this._addedSeeds = [];
    this.models = {};
    this.controllers = {};
    
    this.helpers = require('./helpers')(this);
    this.middleware = require('./middleware')(this);
    this.log = this.log.bind(this);

    ['clear', 'migrate', 'seed', 'rollback'].forEach(flagName => {
      this[flagName] = this.flag.bind(this, flagName);
    })
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
    // Groups the seeds by their static `runOrder` value (defaults to 999999).
    // Then groups are sorted by their `runOrder`. The groups are run then sequentially 
    // with the individual seeds in each group being run in parallel.
    const seedGroups = Array.from(
      this._addedSeeds
        .filter(isFunction)
        .map(seedFn => {
          if(seedFn.runOrder == null) seedFn.runOrder = 999999;
          return seedFn;
        })
        .reduce((groups, seedFn) => {
          const { runOrder } = seedFn;
          if(groups.has(runOrder)) groups.get(runOrder).push(seedFn);
          else groups.set(runOrder, [seedFn]);
          return groups;
        }, new Map())
        .entries()
    )
    .sort(([a], [b]) => a - b)
    .map(([/*runOrder*/, seedFns]) => seedFns);

    for(let seedFns of seedGroups) {
      await Promise.all(seedFns.map(
        seedFn => seedFn(this)
          .then(() => this.log(`Seed "${seedFn.name}" ran`))
      ));
    }
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
      .seeds('seeds/**/*.seed.js');

    return this;
  }

  async start() {
    if(this._discover) await this._discover.queue;
    nodeCleanup(() => this.stop());

    const config = this._config;
    const Database = require('./Database')(this);
    const Webserver = require('./Webserver')(this);
    const Router = require('./Router')(this);

    this.database = new Database(config.database);
    this.webserver = new Webserver(config.webserver);
    this.Router = Router;
    this.api = new Router({prefix: '/api'});
    
    const { flags } = this;

    if(flags.clear) await this.database.drop();

    await this.database.start();
    await this.webserver.start();

    if(flags.rollback) await this.database.rollback();
    if(flags.migrate) await this.database.migrate();

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

Rapid.test = (rapidFn, testFn=test) => {
  return async function rapidTest(description, fn) {
    testFn(description, async () => {
      try {
        var rapid = rapidFn();
        await rapid.start();
        rapid.axios = require('axios').create({
          baseURL: `http://127.0.0.1:${rapid.webserver.config.port}`
        });
        await fn(rapid);
      } finally {
        await rapid.stop();
      }
    });
  };
}

module.exports = Rapid;
