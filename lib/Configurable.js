
module.exports = class Configurable {
  constructor(...configs) {
    this.config = Object.assign(this.defaultConfig || {}, ...configs);
  }
};
