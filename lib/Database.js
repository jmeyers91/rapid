
module.exports = rapid => {
  const Knex = require('knex');
  const Objection = require('objection');
  const { DbErrors } = require('objection-db-errors');
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

    constructor(...configs) {
      super(...configs);
      if(rapid.env === 'test') {
        const { connection } = this.config;
        this.config.connection = Object.assign({}, connection, {
          database: connection.database + '_test'
        });
      }
    }

    async start() {
      const { config } = this;
      if(!await databaseExists(config)) {
        await createDatabase(config);
        rapid.log(`Created database "${this.databaseName}"`);
      }
      const knex = this.knex = Knex(config);
      const { Model } = Objection;
      Model.knex(knex);
      rapid.Model = DbErrors(Model);
      // rapid.Model = class RapidModel extends DbErrors(Model) {
      //   static get virtualAttributes() { return ['_type']; }
      //   get _type() { return this.constructor.name; }
      //   static get jsonSchema() {
      //     const { schema } = this;
      //     return Object.assign({}, schema, {
      //       properties: Object.assign({}, schema.properties, {
      //         _type: {type: 'string'},
      //       })
      //     });
      //   }
      // };
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

    async drop() {
      if(rapid.env === 'production') {
        rapid.log('Ignoring database drop in production environment');
        return;
      }
      await dropDatabase(this.config);
      rapid.log(`Dropped database "${this.databaseName}"`);
    }

    async migrate() {
      const knex = this.knex;
      const [ _ , migrations ] = await knex.migrate.latest(migrationConfig);
      for(let migration of migrations) {
        rapid.log(`Ran migration ${rapid.relativePath(migration)}`);
      }
      if(!migrations.length) {
        rapid.log('All migrations are up to date');
      }
    }

    async rollback() {
      const knex = this.knex;
      const [ _ , migrations ] = await knex.migrate.rollback(migrationConfig);
      for(let migration of migrations) {
        rapid.log(`Rolled back migration ${rapid.relativePath(migration)}`);
      }
    }
  }
};
