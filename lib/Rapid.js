const path = require('path');
const isFunction = require('lodash/isFunction');
const flatten = require('lodash/flatten');
const identity = require('lodash/identity');
const camelCase = require('lodash/camelCase');
const uuid = require('uuid/v4');
const nodeCleanup = require('node-cleanup');
const Ajv = require('ajv');
const ajvErrors = require('ajv-errors');
const chunkedAsync = require('./utils/chunkedAsync');
const chunkByRunOrder = require('./utils/chunkByRunOrder');
const readOrCreateFile = require('./utils/readOrCreateFile');
const { NODE_ENV } = process.env;

if (!NODE_ENV)
  throw new Error(
    'You must define a NODE_ENV environmental variable.\nAdd "export NODE_ENV=development" to ~/.bashrc or ~/.bash_profile.',
  );

const availableFlags = [
  'clear',
  'migrate',
  'seed',
  'rollback',
  'disableWebserver',
];

function loadSecret(rapid) {
  return (
    process.env.SECRET ||
    readOrCreateFile.sync(rapid.localPath('.jwtsecret'), uuid)
  );
}

class Rapid {
  constructor(root, config) {
    this.isTest = NODE_ENV === 'test';

    this.root = root;
    this.config = {};
    if (config) this.addConfigs(config);

    this.secret = this.isTest ? uuid() : loadSecret(this);
    this.flags = {};
    this._addedModels = [];
    this._addedControllers = [];
    this._addedRoutes = [];
    this._addedActions = [];
    this._addedSeeds = [];
    this._addedHooks = [];
    this._addedChannels = [];
    this._hooks = [];

    this.models = {};
    this.controllers = {};
    this.actions = {};
    this.actionObjects = [];

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
    this.Action = require('./Action')(this);
    this.helpers = require('./helpers')(this);
    this.middleware = require('./middleware')(this);

    this.log = this.isTest ? identity : this.log.bind(this);
    const Discover = require('./Discover')(this);
    this.discover = new Discover();

    for (let flagName of availableFlags) {
      this[flagName] = () => this.flag(flagName);
    }
  }

  get jwtDuration() {
    return this.config.jwtDuration;
  }

  get databaseEnabled() {
    return this.config.database !== false;
  }

  get socketIOEnabled() {
    return !!this.config.socketIO && this._addedChannels.length;
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
    configs = configs.map(config =>
      typeof config === 'function' ? config(this) : config,
    );
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

  addChannels(...channels) {
    this._addedChannels.push(...channels);
    return this;
  }

  action(name, schema, fn) {
    if (this.actions[name]) {
      throw new Error(
        `Duplicate action "${name}". An action with that name already exists.`,
      );
    }
    if (arguments.length === 2) {
      fn = schema;
      schema = null;
    }

    const { Action } = this;
    const action = new Action(name);

    if (schema) action.schema(schema);
    if (fn) action.receiver(fn);

    this.actions[name] = action.run.bind(action);
    this.actionObjects.push(action);

    return action;
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
    const { api, Router, actionObjects, _addedRoutes } = this;

    for (let routeDef of _addedRoutes) {
      if (isFunction(routeDef)) {
        const result = routeDef(this);
        if (result instanceof Router && result !== api) {
          api.use(result.routes());
          api.use(result.allowedMethods());
        }
      }
    }
    for (let action of actionObjects) {
      action.attachRoutes();
    }
    this.log('Resolved routes');
  }

  _resolveActions() {
    const { _addedActions } = this;

    if (_addedActions.length) {
      for (let actionDef of _addedActions) {
        if (isFunction(actionDef)) {
          actionDef(this);
        }
      }
      this.log('Resolved actions');
    }
  }

  _resolveChannels() {
    const { _addedChannels } = this;

    if (_addedChannels.length) {
      for (let channelDef of _addedChannels) {
        if (isFunction(channelDef)) channelDef(this);
      }
      this.log('Resolved channels');
    }
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
    this.discover
      .configs(
        // default config is loaded first
        'config/config.default.js',
        'config/default.config.js',

        // then environment config
        `config/config.${NODE_ENV}.js`,
        `config/${NODE_ENV}.config.js`,

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
      .hooks('hooks/**/*.hook.js')
      .channels('channels/**/*.channel.js');

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

    // Discover models, controllers, routers, seeds, hooks, in the app root
    await this.discover.run();

    // Attach app hooks
    await this._runHooks();
    await this._hookEmit('rapidWillStart');

    const { config, flags, databaseEnabled, socketIOEnabled } = this;

    if (databaseEnabled) {
      const Database = require('./Database')(this);
      this.database = new Database(config.database);

      if (flags.clear) {
        await this._hookEmit('databaseWillClear');
        await this.database.drop();
        await this._hookEmit('databaseDidClear');
      }

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
      const Webserver = require('./Webserver')(this);
      const Router = require('./Router')(this);

      this.webserver = new Webserver(config.webserver);
      this.api = new Router({ prefix: '/api' });
      this.Router = Router;

      await this._hookEmit('webserverWillStart');
      await this.webserver.start();
      await this._hookEmit('webserverDidStart');

      if (socketIOEnabled) {
        const SocketServer = require('./SocketServer')(this);
        this.socketServer = new SocketServer(config.socketServer);
        await this._hookEmit('socketWillStart');
        await this.socketServer.start();
        await this._hookEmit('socketDidStart');

        await this._hookEmit('channelsWillAttach');
        await this._resolveChannels();
        await this._hookEmit('channelsDidAttach');
      }

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
