const Knex = require('knex');

module.exports = async function createDatabase(databaseConfig) {
  const { connection } = databaseConfig;
  const config = {
    ...databaseConfig,
    connection: {
      ...connection,
      database: 'postgres',
    },
  };

  const knex = Knex(config);
  await knex.raw(`CREATE DATABASE ${databaseConfig.connection.database}`);
  await knex.destroy();
};
