const Knex = require('knex');

async function createPostgres(databaseConfig) {
  const { connection } = databaseConfig;
  const config = Object.assign({}, databaseConfig, {
    connection: Object.assign({}, connection, {
      database: 'postgres'
    })
  });
  const knex = Knex(config);
  await knex.raw(`CREATE DATABASE ${databaseConfig.connection.database}`);
  await knex.destroy();
}

module.exports = function createDatabase(databaseConfig) {
  const { client } = databaseConfig;
  if (client === 'pg') return createPostgres(databaseConfig);
  if (client === 'sqlite') return;
  // sqlite db file gets auto-created
  else throw new Error(`createDatabase doesn't support ${client}`);
};
