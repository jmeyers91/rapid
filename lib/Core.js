const Configurable = require('./Configurable');

module.exports = class Core extends Configurable {
  constructor(rapid, ...configs) {
    super(...configs);
    this.name = this.constructor.name;
    this.rapid = rapid;
  }

  log(...args) {
    return this.rapid.log(...args);
  }

  async start() {}

  async stop() {}
};
