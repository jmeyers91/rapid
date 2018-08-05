module.exports = rapid => {
  const Knex = require('knex');
  const Objection = require('objection');
  const Configurable = require('./Configurable');
  const databaseExists = require('./utils/databaseExists');
  const createDatabase = require('./utils/createDatabase');
  const dropDatabase = require('./utils/dropDatabase');
  const { knexSnakeCaseMappers } = Objection;

  const { isTest } = rapid;
  const migrationConfig = { directory: rapid.localPath('migrations') };

  return class Database extends Configurable {
    get defaultConfig() {
      return Object.assign(
        {
          client: 'pg',
          connection: {
            user: process.env.USER || 'root',
            password: '',
            database: 'rapid_app'
          },
          migrations: {
            tableName: 'migrations'
          }
        },
        knexSnakeCaseMappers()
      );
    }

    get databaseName() {
      return this.config.connection.database;
    }

    constructor(...configs) {
      super(...configs);

      if (isTest) {
        const uuidv4 = require('uuid/v4');
        const { connection } = this.config;
        this.config.connection = Object.assign({}, connection, {
          // During tests, the database name have "_test_" and a UUID appended to avoid conflicting with other tests
          // example: app_database -> app_database_test_109156be_c4fb_41ea_b1b4_efe1671c5836
          database: connection.database + '_test_' + uuidv4().replace(/-/g, '_')
        });
      }

      this._objectionPlugins = [require('objection-db-errors').DbErrors];
      this._fixDateParsing();
    }

    // Force date values to be serialized as Unix timestamps instead of strings (see: https://github.com/Vincit/objection.js/issues/91#issuecomment-191080513)
    _fixDateParsing() {
      const { types } = require('pg');
      const TIMESTAMPTZ_OID = 1184;
      const TIMESTAMP_OID = 1114;
      const parseFn = value => {
        if (value == null) return null;
        return new Date(value).getTime();
      };
      types.setTypeParser(TIMESTAMPTZ_OID, parseFn);
      types.setTypeParser(TIMESTAMP_OID, parseFn);
    }

    async start() {
      const { config, _objectionPlugins } = this;
      if (!(await databaseExists(config))) {
        await createDatabase(config);
        rapid.log(`Created database "${this.databaseName}"`);
      }
      const knex = (this.knex = Knex(config));
      const { Model } = Objection;
      Model.knex(knex);
      rapid.Model = _objectionPlugins.reduce(
        (Model, plugin) => plugin(Model),
        Model
      );
      rapid.log(`Connected to database "${this.databaseName}"`);
    }

    async stop() {
      const { knex } = this;
      if (knex) {
        this.knex = null;
        await knex.destroy();
        rapid.log(`Disconnected from database "${this.databaseName}"`);
      }
    }

    async drop() {
      if (rapid.env === 'production') {
        rapid.log('Ignoring database drop in production environment');
        return;
      }
      await dropDatabase(this.config);
      rapid.log(`Dropped database "${this.databaseName}"`);
    }

    async migrate() {
      const knex = this.knex;
      const [_, migrations] = await knex.migrate.latest(migrationConfig);
      for (let migration of migrations) {
        rapid.log(`Ran migration ${rapid.relativePath(migration)}`);
      }
      if (!migrations.length) {
        rapid.log('All migrations are up to date');
      }
    }

    async rollback() {
      const knex = this.knex;
      const [_, migrations] = await knex.migrate.rollback(migrationConfig);
      for (let migration of migrations) {
        rapid.log(`Rolled back migration ${rapid.relativePath(migration)}`);
      }
    }
  };
};
