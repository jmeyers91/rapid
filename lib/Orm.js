const Core = require('./Core');
const Objection = require('objection');

module.exports = class Orm extends Core {
  start() {
    const { rapid } = this;
    const { knex } = rapid.database;
    const { Model } = Objection;

    Model.knex(knex);
    rapid.Model = Model;
  }
} 