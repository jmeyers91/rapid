module.exports = rapid => {
  const Knex = require('knex');
  const Objection = require('objection');
  const pg = require('pg');
  const { DbErrors } = require('objection-db-errors');
  const parseDatabaseUrl = require('parse-database-url');
  const Configurable = require('./Configurable');
  const databaseExists = require('./utils/databaseExists');
  const createDatabase = require('./utils/createDatabase');
  const dropDatabase = require('./utils/dropDatabase');
  const { knexSnakeCaseMappers } = Objection;

  const migrationConfig = { directory: rapid.localPath('migrations') };

  // Force date values to be serialized as Unix timestamps instead of strings (see: https://github.com/Vincit/objection.js/issues/91#issuecomment-191080513)
  patchPgToUseIntDates();
  function patchPgToUseIntDates() {
    const TIMESTAMPTZ_OID = 1184;
    const TIMESTAMP_OID = 1114;
    pg.types.setTypeParser(TIMESTAMPTZ_OID, parseDate);
    pg.types.setTypeParser(TIMESTAMP_OID, parseDate);
    function parseDate(value) {
      if (value == null) return null;
      return new Date(value).getTime();
    }
  }

  return class Database extends Configurable {
    get defaultConfig() {
      return {
        client: 'pg',
        connection: {
          user: process.env['USER'] || 'root',
          password: '',
          database: 'rapid_app',
        },
        migrations: {
          tableName: 'migrations',
        },
        dropWhenFinished: false,
        ...knexSnakeCaseMappers(), // Converts table/column names from snake_case to camelCase
      };
    }

    get databaseConnectionObject() {
      if (!this._databaseConnectionObject) {
        const { connection } = this.config;
        if (typeof connection === 'string') {
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

    // Create the database if it doesn't exist and connect to it
    async start() {
      const { config } = this;
      if (!(await databaseExists(config))) {
        await createDatabase(config);
        rapid.log(`Created database "${this.databaseName}"`);
      }
      const knex = (this.knex = Knex(config));
      const { Model } = Objection;
      Model.knex(knex);
      rapid.Model = DbErrors(Model);
      rapid.log(`Connected to database "${this.databaseName}"`);
    }

    // Disconnect from the database
    async stop() {
      const { knex, config } = this;
      try {
        if (knex) {
          this.knex = null;
          await knex.destroy();
          rapid.log(`Disconnected from database "${this.databaseName}"`);
        }
      } finally {
        if (config.dropWhenFinished) {
          // Used in tests
          await this.drop();
        }
      }
    }

    // Drop the database. This is a no-op in production environments
    async drop() {
      if (process.env['NODE_ENV'] === 'production') {
        rapid.log('Ignoring database drop in production environment');
        return;
      }
      await dropDatabase(this.config);
      rapid.log(`Dropped database "${this.databaseName}"`);
    }

    // Run database migrations
    async migrate() {
      const knex = this.knex;
      const [, /* */ migrations] = await knex.migrate.latest(migrationConfig);
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
      const [, /* */ migrations] = await knex.migrate.rollback(migrationConfig);
      for (let migration of migrations) {
        rapid.log(`Rolled back migration ${rapid.relativePath(migration)}`);
      }
    }
  };
};
