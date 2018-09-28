const Knex = require('knex');

// https://www.postgresql.org/docs/9.4/static/errcodes-appendix.html
const postgresMissingDatabaseErrorCode = '3D000';
const testQuery = 'SELECT 1+1 AS result';

module.exports = async function databaseExists(databaseConfig) {
  const knex = Knex(databaseConfig);
  return knex
    .raw(testQuery)
    .then(() => knex.destroy())
    .then(() => true)
    .catch(error => {
      if (error && error.code === postgresMissingDatabaseErrorCode) {
        return false;
      }
      throw error;
    });
};
