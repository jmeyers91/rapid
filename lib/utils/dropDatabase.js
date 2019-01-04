const Knex = require('knex');

module.exports = async function dropDatabase(databaseConfig) {
  const { connection } = databaseConfig;
  const config = Object.assign({}, databaseConfig, {
    connection: Object.assign({}, connection, {
      database: 'postgres',
    }),
  });
  const knex = Knex(config);
  try {
    await knex
      .raw(`DROP DATABASE ${databaseConfig.connection.database}`)
      .catch(() => {});
  } finally {
    await knex.destroy();
  }
};
