module.exports = rapid => {
  const Knex = require('knex');
  const Objection = require('objection');
  const pg = require('pg');
  const parseDatabaseUrl = require('parse-database-url');
  const Configurable = require('./Configurable');
  const databaseExists = require('./utils/databaseExists');
  const createDatabase = require('./utils/createDatabase');
  const dropDatabase = require('./utils/dropDatabase');
  const { knexSnakeCaseMappers } = Objection;

  const { isTest } = rapid;
  const migrationConfig = { directory: rapid.localPath('migrations') };

  return class Database extends Configurable {
    get defaultConfig() {
      const { env } = process;

      return {
        client: 'pg',
        connection: {
          user: env['USER'] || 'root',
          password: '',
          database: 'rapid_app'
        },
        migrations: {
          tableName: 'migrations'
        },
        ...knexSnakeCaseMappers(), // Converts table/column names from snake_case to camelCase
      };
    }

    get databaseConnectionObject() {
      if(!this._databaseConnectionObject) {
        const { connection } = this.config;
        if(typeof connection === 'string') {
          this._databaseConnectionObject = parseDatabaseUrl(connection);
        } else {
          this._databaseConnectionObject = connection;
        }
      }
      return this._databaseConnectionObject;
    }

    get databaseName() {
      return this.databaseConnectionObject.database;
    }

    constructor(...configs) {
      super(...configs);

      if (isTest) {
        // During tests, use a temp database with a randomly generated name
        const uuidv4 = require('uuid/v4');
        const { connection } = this.config;

        this.config.connection = {
          ...connection,
          database: connection.database + '_test_' + uuidv4().replace(/-/g, '_')
        };
      }

      this._objectionPlugins = [
        require('objection-db-errors').DbErrors // Improved database errors
      ];

      this._fixDateParsing();
    }

    // Force date values to be serialized as Unix timestamps instead of strings (see: https://github.com/Vincit/objection.js/issues/91#issuecomment-191080513)
    _fixDateParsing() {
      const TIMESTAMPTZ_OID = 1184;
      const TIMESTAMP_OID = 1114;
      pg.types.setTypeParser(TIMESTAMPTZ_OID, parseDate);
      pg.types.setTypeParser(TIMESTAMP_OID, parseDate);
      function parseDate(value) {
        if (value == null) return null;
        return new Date(value).getTime();
      }
    }

    // Create the database if it doesn't exist and connect to it
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

    // Disconnect from the database
    async stop() {
      const { knex } = this;
      if (knex) {
        this.knex = null;
        await knex.destroy();
        rapid.log(`Disconnected from database "${this.databaseName}"`);
      }
    }

    // Drop the database. This is a no-op in production environments
    async drop() {
      if (rapid.env === 'production') {
        rapid.log('Ignoring database drop in production environment');
        return;
      }
      await dropDatabase(this.config);
      rapid.log(`Dropped database "${this.databaseName}"`);
    }

    // Run database migrations
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

    // Rollback database migrations
    async rollback() {
      const knex = this.knex;
      const [_, migrations] = await knex.migrate.rollback(migrationConfig);
      for (let migration of migrations) {
        rapid.log(`Rolled back migration ${rapid.relativePath(migration)}`);
      }
    }
  };
};
