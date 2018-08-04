const Knex = require('knex');
const { unlink } = require('then-fs');

async function dropPostgres(databaseConfig) {
  const { connection } = databaseConfig;
  const config = Object.assign({}, databaseConfig, {
    connection: Object.assign({}, connection, {
      database: 'postgres'
    })
  });
  const knex = Knex(config);
  await knex
    .raw(`DROP DATABASE ${databaseConfig.connection.database}`)
    .catch(error => {});
  await knex.destroy();
}

async function dropSqlite(databaseConfig) {
  const { connection } = databaseConfig;
  if (connection === ':memory') return;
  const { filename } = connection;
  if (filename) return unlink(filename);
}

module.exports = function dropDatabase(databaseConfig) {
  const { client } = databaseConfig;
  if (client === 'pg') return dropPostgres(databaseConfig);
  if (client === 'sqlite') return dropSqlite(databaseConfig);
  else throw new Error(`dropDatabase doesn't support ${client}`);
};
