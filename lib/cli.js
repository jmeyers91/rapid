#!/usr/bin/env node

const argv = require('yargs').argv;
const path = require('path');
const rootDir = argv.root ? path.resolve(argv.root) :  process.cwd();
const commands = argv._.reduce((commands, key) => {
  commands[key] = true;
  return commands;
}, {});

if(!argv._.length) commands.start = true;

function loadConfig(rootDir) {
  const env = process.env.NODE_ENV || 'development';
  const merge = require('lodash/merge');
  const { existsSync } = require('fs');

  function loadConfig(configPath) {
    configPath = path.join(rootDir, configPath);
    return existsSync(configPath) ? require(configPath) : null
  }

  return merge({}, 
    loadConfig('config/config.default.js'),
    loadConfig(`config/config.${env.toLowerCase()}.js`) || loadConfig(`config/config.js`)
  );
}

async function resolveAppModules(rapid) {
  async function resolveModels() {
    return resolveRootExtension('model', 'models/**/*.model.js', modelFn => {
      rapid.addModel(modelFn(rapid));
    });
  }

  async function resolveControllers() {
    return resolveRootExtension('controller', 'controllers/**/*.controller.js', controllerFn => {
      rapid.addController(controllerFn(rapid));
    });
  }

  async function resolveRouters() {
    return resolveRootExtension('router', 'routers/**/*.router.js', routerFn => {
      rapid.addRouter(routerFn(rapid))
    });
  }

  async function resolveRootExtension(name, patterns, fn) {
    for(let p of await rapid.globby(patterns)) {
      try {
        fn(require(p));
        rapid.log(`Resolved ${name} ${rapid.relativePath(p)}`)
      } catch(error) {
        rapid.log(`Failed to resolve ${name} "${p}":`, error);
      }
    }
  }

  await resolveModels();
  await resolveControllers();
  await resolveRouters();
}

async function main() {
  const Rapid = require('./Rapid');
  const rapid = await new Rapid(rootDir, loadConfig(rootDir));

  if(commands.refresh || commands.clear) await rapid.database.drop();
  if(commands.refresh || commands.migrate) await rapid.database.migrate();
  if(commands.refresh || commands.seed) await rapid.database.seed();
  if(commands.start) await rapid.start(resolveAppModules);
  if(commands.stop || !commands.start) await rapid.stop();
}

async function watch() {
  const nodemon = require('nodemon');
  const args = process.argv.slice(2).filter(s => s !== '--watch');
  const cliExe = path.join(__dirname, 'cli.js');

  nodemon({
    exec: path.join(__dirname, 'cli.js'),
    ext: 'js json',
    watch: [rootDir],
    stdout: true,
    args: args,
    delay: 2000
  });
  
  nodemon.on('start', () => {
    console.log('App has started');
  }).on('quit', () => {
    console.log('App has quit');
    process.exit();
  }).on('restart', files => {
    console.log(`Restarting...\n`);
  });
}

if(argv.watch) {
  watch().catch(error => console.log(error));
} else {
  main().catch(error => console.log(error));
}
