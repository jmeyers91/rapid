const Knex = require('knex');
const Objection = require('objection');
const Core = require('./Core');
const databaseExists = require('./utils/databaseExists');
const createDatabase = require('./utils/createDatabase');
const dropDatabase = require('./utils/dropDatabase');
const { knexSnakeCaseMappers } = Objection;

module.exports = class Database extends Core {
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
    return this.config.connection.database;
  }

  async start() {
    if(!await this.exists()) await this.create();
    this.connect();
  }

  async stop() {
    const { knex } = this;
    if(knex) {
      this.knex = null;
      await knex.destroy();
      this.log(`Disconnected from database "${this.databaseName}"`);
    }
  }

  connect() {
    const knex = this.knex = Knex(this.config);
    this.rapid.Model = Objection.Model;
    this.rapid.Model.knex(knex);
    this.log(`Connected to database "${this.databaseName}"`);
  }

  exists() {
    return databaseExists(this.config);
  }

  async create() {
    await createDatabase(this.config);
    this.log(`Created database ${this.databaseName}`);
  }

  async drop() {
    await this.stop();
    await dropDatabase(this.config);
    this.log(`Dropped database ${this.databaseName}`);
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
      directory: this.rapid.localPath('migrations')
    };
  }

  async migrate() {
    const { rapid } = this;
    const knex = await this._getKnex();
    const [ _ , migrations ] = await knex.migrate.latest(this._getMigrationConfig());
    for(let migration of migrations) {
      this.log(`Ran migration ${rapid.relativePath(migration)}`);
    }
    if(!migrations.length) {
      this.log('All migrations are up to date');
    }
  }

  async rollback() {
    const { rapid } = this;
    const knex = await this._getKnex();
    const [ _ , migrations ] = await knex.migrate.rollback(this._getMigrationConfig());
    for(let migration of migrations) {
      this.log(`Rolled back migration ${rapid.relativePath(migration)}`);
    }
  }

  async seed() {
    const seedPaths = await this.rapid.globby('seeds/**/*.seed.js');

    for(let seedPath of seedPaths) {
      const seedFn = require(seedPath)
      if(typeof seedFn === 'function') {
        await seedFn(this.rapid);
        this.log(`Ran seed ${seedFn.name}`);
      }
    }
  }

  async createMigration(name) {
    const { rapid } = this;
    const knex = await this._getKnex();
    const migrationPath = await knex.migrate.make(name.replace(/\s/g, '_'), this._getMigrationConfig());
    this.log(`Created migration ${rapid.relativePath(migrationPath)}`);
  }

  async createSeed(name) {
    const { writeFile, exists } = require('then-fs');
    const camelCase = require('lodash/camelCase');
    const { rapid } = this;
    const seedName = camelCase(name);
    const seedPath = rapid.localPath(`seeds/${seedName}.seed.js`);
    const seedContent = `\nmodule.exports = async function ${seedName}(rapid) {\n\n};\n`;
    if(await exists(seedPath)) throw new Error(`Seed already exists: ${rapid.relativePath(seedPath)}`);
    await writeFile(seedPath, seedContent);
    this.log(`Created seed ${rapid.relativePath(seedPath)}`);
  }
};
