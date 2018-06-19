
module.exports = rapid => {
  const globby = require('globby');
  const identity = require('lodash/identity');

  function localGlob(patterns, options) {
    patterns = [].concat(patterns).map(pattern => rapid.localPath(pattern));
    return globby(patterns, options);
  }

  return class Discover {
    constructor() {
      this.queue = Promise.resolve();
    }

    _enqueue(fn) {
      this.queue = this.queue.then(fn);
      return this.queue;
    }

    _searchAndAdd(addMethod, patterns) {
      this._enqueue(async () => {
        const paths = await localGlob(patterns);
        const results = paths.map(require).filter(identity);
        if(results.length) rapid[addMethod](...results);
      });
    }

    configs(...patterns) {
      this._searchAndAdd('addConfigs', patterns);
      return this;
    }

    models(...patterns) {
      this._searchAndAdd('addModels', patterns);
      return this;
    }

    controllers(...patterns) {
      this._searchAndAdd('addControllers', patterns);
      return this;
    }

    routers(...patterns) {
      this._searchAndAdd('addRouters', patterns);
      return this;
    }

    async seeds(...patterns) {
      this._searchAndAdd('addSeeds', patterns);
      return this;
    }
  };
};
