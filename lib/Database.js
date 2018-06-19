
module.exports = rapid => {
  const Knex = require('knex');
  const Objection = require('objection');
  const Configurable = require('./Configurable');
  const databaseExists = require('./utils/databaseExists');
  const createDatabase = require('./utils/createDatabase');
  const dropDatabase = require('./utils/dropDatabase');
  const { knexSnakeCaseMappers } = Objection;
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
      if(!this.isSqlite && !await this.exists()) await this.create();
      this.connect();
    }

    async stop() {
      const { knex } = this;
      if(knex) {
        this.knex = null;
        await knex.destroy();
        rapid.log(`Disconnected from database "${this.databaseName}"`);
      }
    }

    connect() {
      const knex = this.knex = Knex(this.config);
      rapid.Model = Objection.Model;
      rapid.Model.knex(knex);
      rapid.log(`Connected to database "${this.databaseName}"`);
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
      await this.connect();
    }

    async _getKnex() {
      if(!this.knex) await this.start();
      return this.knex;
    }

    _getMigrationConfig() {
      return {
        directory: rapid.localPath('migrations')
      };
    }

    async migrate() {
      const knex = await this._getKnex();
      const [ _ , migrations ] = await knex.migrate.latest(this._getMigrationConfig());
      for(let migration of migrations) {
        rapid.log(`Ran migration ${rapid.relativePath(migration)}`);
      }
      if(!migrations.length) {
        rapid.log('All migrations are up to date');
      }
    }

    async rollback() {
      const knex = await this._getKnex();
      const [ _ , migrations ] = await knex.migrate.rollback(this._getMigrationConfig());
      for(let migration of migrations) {
        rapid.log(`Rolled back migration ${rapid.relativePath(migration)}`);
      }
    }

    async seed() {
      const seedPaths = await rapid.relativeGlob('seeds/**/*.seed.js');

      for(let seedPath of seedPaths) {
        const seedFn = require(seedPath)
        if(typeof seedFn === 'function') {
          await seedFn(rapid);
          rapid.log(`Ran seed ${seedFn.name}`);
        }
      }
    }

    async createMigration(name) {
      const knex = await this._getKnex();
      const migrationPath = await knex.migrate.make(name.replace(/\s/g, '_'), this._getMigrationConfig());
      rapid.log(`Created migration ${rapid.relativePath(migrationPath)}`);
    }

    async createSeed(name) {
      const { writeFile, exists } = require('then-fs');
      const camelCase = require('lodash/camelCase');
      const seedName = camelCase(name);
      const seedPath = rapid.localPath(`seeds/${seedName}.seed.js`);
      const seedContent = `\nmodule.exports = async function ${seedName}(rapid) {\n\n};\n`;
      if(await exists(seedPath)) throw new Error(`Seed already exists: ${rapid.relativePath(seedPath)}`);
      await writeFile(seedPath, seedContent);
      rapid.log(`Created seed ${rapid.relativePath(seedPath)}`);
    }
  }
};
