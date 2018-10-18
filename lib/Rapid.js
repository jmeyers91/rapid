const path = require('path');
const isFunction = require('lodash/isFunction');
const flatten = require('lodash/flatten');
const identity = require('lodash/identity');
const camelCase = require('lodash/camelCase');
const nodeCleanup = require('node-cleanup');
const Ajv = require('ajv');
const ajvErrors = require('ajv-errors');
const chunkedAsync = require('./utils/chunkedAsync');
const chunkByRunOrder = require('./utils/chunkByRunOrder');

const availableFlags = [
  'clear',
  'migrate',
  'seed',
  'rollback',
  'disableWebserver',
];

class Rapid {
  constructor(root, config) {
    this.env = process.env.NODE_ENV || 'development';
    this.isTest = this.env === 'test';

    this.root = root;
    this.config = {};
    if (config) this.addConfigs(config);

    this.flags = {};
    this._addedModels = [];
    this._addedControllers = [];
    this._addedRoutes = [];
    this._addedActions = [];
    this._addedSeeds = [];
    this._addedHooks = [];
    this._hooks = [];

    this.models = {};
    this.controllers = {};
    this.actions = {};

    // For JSON validation in actions
    this.ajv = ajvErrors(
      new Ajv({
        coerceTypes: true,
        useDefaults: true,
        allErrors: true,
        jsonPointers: true,
      }),
    );
    this.ValidationError = Ajv.ValidationError;
    this.helpers = require('./helpers')(this);
    this.middleware = require('./middleware')(this);
    this.log = this.isTest ? identity : this.log.bind(this);

    const Discover = require('./Discover')(this);
    this.discover = new Discover();

    for (let flagName of availableFlags) {
      this[flagName] = () => this.flag(flagName);
    }
  }

  get databaseEnabled() {
    return this.config.database !== false;
  }

  flag(key) {
    this.flags[key] = true;
    return this;
  }

  log(v) {
    console.log.apply(console, arguments);
    return v;
  }

  localPath(p) {
    if (path.isAbsolute(p)) return p;
    return path.join(this.root, p);
  }

  relativePath(p) {
    return path.relative(this.root, p);
  }

  addConfigs(...configs) {
    Object.assign(this.config, ...configs);
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

  addRoutes(...routes) {
    this._addedRoutes.push(...routes);
    return this;
  }

  addActions(...actions) {
    this._addedActions.push(...actions);
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

  action(name, schema, run) {
    const { ajv } = this;
    if (this.actions[name]) {
      throw new Error(
        `Duplicate action "${name}". An action with that name already exists.`,
      );
    }

    if (arguments.length === 2) {
      run = schema;
      schema = null;
    }

    let validate = null;
    if (schema) {
      validate = ajv.compile({
        ...schema,
        $async: true,
      });
    }

    const action = validate
      ? async (props = {}) => {
          await validate(props);
          return run(props);
        }
      : async (props = {}) => run(props);

    this.actions[name] = action;
  }

  _resolveModels() {
    for (let modelDef of this._addedModels) {
      const Model = isFunction(modelDef) && modelDef(this);
      if (Model) {
        this.models[Model.name] = Model;
        this.log(`Resolved model ${Model.name}`);
      }
    }
  }

  _resolveControllers() {
    const { controllers, _addedControllers } = this;

    for (let controllerDef of _addedControllers) {
      const Controller = isFunction(controllerDef) && controllerDef(this);
      if (Controller) {
        const name = camelCase(Controller.name);
        controllers[name] = new Controller();
        this.log(`Resolved controller ${name}`);
      }
    }
  }

  _resolveRoutes() {
    const { api, Router, _addedRoutes } = this;

    for (let routeDef of _addedRoutes) {
      if (isFunction(routeDef)) {
        const result = routeDef(this);
        if (result instanceof Router && result !== api) {
          api.use(result.routes());
          api.use(result.allowedMethods());
        }
      }
    }
    this.log('Resolved routes');
  }

  _resolveActions() {
    const { _addedActions } = this;

    for (let actionDef of _addedActions) {
      if (isFunction(actionDef)) actionDef(this);
    }
    this.log('Resolved actions');
  }

  async _runSeeds() {
    await chunkedAsync(chunkByRunOrder(this._addedSeeds), async (seedFn, i) => {
      const seedName = seedFn.name || `Seed ${i + 1}`;
      await seedFn(this);
      this.log(`Ran seed ${seedName}`);
    });
  }

  async _runHooks() {
    this._hooks = flatten(
      await chunkedAsync(
        chunkByRunOrder(this._addedHooks.filter(identity)),
        hook => {
          if (isFunction(hook)) return hook(this);
          return hook;
        },
      ),
    ).filter(identity);
  }

  async _hookEmit(eventKey) {
    for (let hook of this._hooks) {
      if (isFunction(hook[eventKey])) {
        await hook[eventKey](this);
      }
    }
  }

  use(...args) {
    this.webserver.koaApp.use(...args);
  }

  autoload() {
    const { env } = this;
    this.discover
      .configs(
        // default config is loaded first
        'config/config.default.js',
        'config/default.config.js',

        // then environment config
        `config/config.${env}.js`,
        `config/${env}.config.js`,

        // then local config
        'config/config.local.js',
        'config/local.config.js',
        'config/config.js',
      )
      .models('models/**/*.model.js')
      .controllers('controllers/**/*.controller.js')
      .routes('routes/**/*.route.js', 'routes/**/*.router.js')
      .actions('actions/**/*.action.js')
      .seeds('seeds/**/*.seed.js')
      .hooks('hooks/**/*.hook.js');

    return this;
  }

  async stop() {
    await this._hookEmit('rapidWillStop');
    await this._hookEmit('beforeStop');
    if (this.webserver) {
      await this.webserver
        .stop()
        .catch(error => this.log('Failed to stop webserver: ' + error.message));
    }
    if (this.database) {
      await this.database
        .stop()
        .catch(error => this.log('Failed to stop database: ' + error.message));
    }
    await this._hookEmit('stop');
    await this._hookEmit('rapidDidStop');
  }

  async start() {
    nodeCleanup(() => this.stop());
    
    // Handle Nodemon kill signal
    process.once('SIGUSR2', async () => {
      await this.stop();
      process.kill(process.pid, 'SIGUSR2');
    });

    // Discover models, controllers, routers, seeds, hooks, in the app root
    await this.discover.run();
    const { databaseEnabled } = this;

    // Attach app hooks
    await this._runHooks();
    await this._hookEmit('rapidWillStart');

    const { config } = this;
    const Webserver = require('./Webserver')(this);
    const Router = require('./Router')(this);

    if (databaseEnabled) {
      const Database = require('./Database')(this);
      this.database = new Database(config.database);
    }
    this.webserver = new Webserver(config.webserver);
    this.api = new Router({ prefix: '/api' });
    this.Router = Router;

    const { flags } = this;

    if (databaseEnabled && flags.clear) {
      await this._hookEmit('databaseWillClear');
      await this.database.drop();
      await this._hookEmit('databaseDidClear');
    }

    if (databaseEnabled) {
      await this._hookEmit('databaseWillStart');
      await this.database.start();
      await this._hookEmit('databaseDidStart');

      if (flags.rollback) {
        await this._hookEmit('rollbackWillRun');
        await this.database.rollback();
        await this._hookEmit('rollbackDidRun');
      }

      if (flags.migrate) {
        await this._hookEmit('migrationsWillRun');
        await this.database.migrate();
        await this._hookEmit('migrationsDidRun');
      }

      await this._hookEmit('modelsWillAttach');
      await this._resolveModels();
      await this._hookEmit('modelsDidAttach');
    }

    await this._hookEmit('actionsWillAttach');
    await this._resolveActions();
    await this._hookEmit('actionsDidAttach');

    await this._hookEmit('controllersWillAttach');
    await this._resolveControllers();
    await this._hookEmit('controllersDidAttach');

    if (databaseEnabled && flags.seed) {
      await this._hookEmit('seedsWillRun');
      await this._runSeeds();
      await this._hookEmit('seedsDidRun');
    }

    // Used by the CLI to avoid port conflicts when running database commands (migrate, seed, clear)
    if (!flags.disableWebserver) {
      await this._hookEmit('webserverWillStart');
      await this.webserver.start();
      await this._hookEmit('webserverDidStart');

      await this._hookEmit('routesWillAttach');
      await this._resolveRoutes();
      this.use(this.api.routes());
      await this._hookEmit('routesDidAttach');

      await this._hookEmit('webserverWillListen');
      await this.webserver.listen();
      await this._hookEmit('webserverDidListen');
    }

    await this._hookEmit('rapidDidStart');

    return this;
  }
}

Rapid.test = require('./testWrapper');

module.exports = Rapid;
