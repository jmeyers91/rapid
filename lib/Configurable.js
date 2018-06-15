const merge = require('lodash/merge');

module.exports = class Configurable {
  constructor(...configs) {
    this.config = merge(this.defaultConfig || {}, ...configs);
  }
}