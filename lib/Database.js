
module.exports = rapid => {
  const Knex = require('knex');
  const Objection = require('objection');
  const Configurable = require('./Configurable');
  const databaseExists = require('./utils/databaseExists');
  const createDatabase = require('./utils/createDatabase');
  const dropDatabase = require('./utils/dropDatabase');
  const { knexSnakeCaseMappers } = Objection;

  const migrationConfig = { directory: rapid.localPath('migrations') };

  return class Database extends Configurable {
    get defaultConfig() {
      return Object.assign({
        client: 'pg',
        connection: {
          user : process.env.USER || 'root',
          password : '',
          database : 'rapid_app'
        },
        migrations: {
          tableName: 'migrations'
        },
      }, knexSnakeCaseMappers());
    }

    get databaseName() {
      const { connection } = this.config;
      if(connection === ':memory:') {
        return `SQLite3 in-memory`;
      }
      return connection.database;
    }

    get isSqlite() {
      return this.config.client === 'sqlite';
    }

    async start() {
      const knex = this.knex = Knex(this.config);
      rapid.Model = Objection.Model;
      rapid.Model.knex(knex);
      rapid.log(`Connected to database "${this.databaseName}"`);
    }

    async stop() {
      const { knex } = this;
      if(knex) {
        this.knex = null;
        await knex.destroy();
        rapid.log(`Disconnected from database "${this.databaseName}"`);
      }
    }

    exists() {
      return databaseExists(this.config);
    }

    async create() {
      await createDatabase(this.config);
      rapid.log(`Created database ${this.databaseName}`);
    }

    async drop() {
      await this.stop();
      await dropDatabase(this.config);
      rapid.log(`Dropped database ${this.databaseName}`);
    }

    async clear() {
      await this.drop();
      await this.create();
    }

    async migrate() {
      const knex = Knex(this.config);
      const [ _ , migrations ] = await knex.migrate.latest(migrationConfig);
      for(let migration of migrations) {
        rapid.log(`Ran migration ${rapid.relativePath(migration)}`);
      }
      if(!migrations.length) {
        rapid.log('All migrations are up to date');
      }
    }

    async rollback() {
      const knex = Knex(this.config);
      const [ _ , migrations ] = await knex.migrate.rollback(migrationConfig);
      for(let migration of migrations) {
        rapid.log(`Rolled back migration ${rapid.relativePath(migration)}`);
      }
    }
  }
};
