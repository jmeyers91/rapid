const Knex = require('knex');

const DATABASE_EXISTS_CODE = '23505';

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
  await knex.raw(`CREATE DATABASE ${databaseConfig.connection.database}`)
    .catch(error => {
      // Ignore database already exists error. Throw everything else.
      if(!error || error.code !== DATABASE_EXISTS_CODE) {
        throw error;
      }
    });

  await knex.destroy();
};
