// The discover module handles finding and adding app modules such as:
// config, models, controllers, routers, seeds, hooks, etc.

module.exports = rapid => {
  const identity = require('lodash/identity');

  // Matches patterns relative to the app root directory
  function localGlob(patterns, options) {
    const globby = require('globby');
    patterns = [].concat(patterns).map(pattern => rapid.localPath(pattern));
    return globby(patterns, options);
  }

  return class Discover {
    constructor() {
      this.queue = [];
    }

    async run() {
      for (let fn of this.queue) {
        await fn();
      }
    }

    enqueue(fn) {
      this.queue.push(fn);
    }

    // Finds, modules in the app directory that match any of the passed patterns.
    // The modules are then added to the rapid instance using the passed method key.
    find(patterns, fn) {
      for (let pattern of patterns) {
        // Resolve patterns in the order they're passed
        this.enqueue(async () => {
          const paths = await localGlob(pattern);
          const results = paths.map(require).filter(identity);
          for (let result of results) {
            await fn(result);
          }
        });
      }

      return this;
    }

    configs(...patterns) {
      return this.find(patterns, def => rapid.addConfigs(def));
    }

    models(...patterns) {
      return this.find(patterns, def => rapid.addModels(def));
    }

    controllers(...patterns) {
      return this.find(patterns, def => rapid.addControllers(def));
    }

    routes(...patterns) {
      return this.find(patterns, def => rapid.addRoutes(def));
    }

    actions(...patterns) {
      return this.find(patterns, def => rapid.addActions(def));
    }

    seeds(...patterns) {
      return this.find(patterns, def => rapid.addSeeds(def));
    }

    hooks(...patterns) {
      return this.find(patterns, def => rapid.addHooks(def));
    }

    channels(...patterns) {
      return this.find(patterns, def => rapid.addChannels(def));
    }
  };
};
