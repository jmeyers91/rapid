const Knex = require('knex');
const { exists } = require('then-fs');

// https://www.postgresql.org/docs/9.4/static/errcodes-appendix.html
const postgresMissingDatabaseErrorCode = '3D000';
const testQuery = 'SELECT 1+1 AS result';

async function postgresExists(databaseConfig) {
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
}

async function sqliteExists(databaseConfig) {
  const { connection } = databaseConfig;
  if (connection === ':memory') return true;
  const { filename } = connection;
  if (filename) return exists(filename);
  return false;
}

module.exports = async function databaseExists(databaseConfig) {
  const { client } = databaseConfig;
  if (client === 'pg') return postgresExists(databaseConfig);
  if (client === 'sqlite') return sqliteExists(databaseConfig);
  else throw new Error(`databaseExists doesn't support ${client}`);
};
