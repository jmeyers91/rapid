// The discover module handles finding and adding app modules such as:
// models, controllers, routers, seeds, hooks, etc.

const identity = require('lodash/identity');

module.exports = rapid => {
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
      for(let fn of this.queue) {
        await fn();
      }
    }

    // Finds, modules in the app directory that match any of the passed patterns.
    // The modules are then added to the rapid instance using the passed method key.
    _searchAndAdd(addMethod, patterns) {
      this.queue.push(async () => {
        const paths = await localGlob(patterns);
        const results = paths.map(require).filter(identity);
        if(results.length) {
          rapid[addMethod](...results);
        }
      });

      return this;
    }

    configs(...patterns) {
      return this._searchAndAdd('addConfigs', patterns);
    }

    models(...patterns) {
      return this._searchAndAdd('addModels', patterns);
    }

    controllers(...patterns) {
      return this._searchAndAdd('addControllers', patterns);
    }

    routers(...patterns) {
      return this._searchAndAdd('addRouters', patterns);
    }

    seeds(...patterns) {
      return this._searchAndAdd('addSeeds', patterns);
    }

    hooks(...patterns) {
      return this._searchAndAdd('addHooks', patterns);
    }
  };
};
