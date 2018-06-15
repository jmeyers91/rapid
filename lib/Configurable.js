const merge = require('lodash/merge');

module.exports = class Configurable {
  constructor(...configs) {
    this.config = merge(this.defaultConfig || {}, ...configs);
  }

  mergeConfig(...configs) {
    this.config = merge(this.config, ...configs);
  }
}