const path = require('path');

function loadConfig(rootDir) {
  const env = process.env.NODE_ENV || 'development';
  const merge = require('lodash/merge');
  const { existsSync } = require('fs');

  function tryLoad(configPath) {
    configPath = path.join(rootDir, configPath);
    return existsSync(configPath) ? require(configPath) : null
  }

  return merge({}, 
    tryLoad('config/config.default.js'),
    tryLoad(`config/config.${env.toLowerCase()}.js`) || tryLoad(`config/config.js`)
  );
}

async function findAppModules(rapid) {
  async function findModels() {
    return resolveRootExtension('model', 'models/**/*.model.js', modelFn => {
      rapid.addModels(modelFn);
    });
  }

  async function findControllers() {
    return resolveRootExtension('controller', 'controllers/**/*.controller.js', controllerFn => {
      rapid.addControllers(controllerFn);
    });
  }

  async function findRouters() {
    return resolveRootExtension('router', 'routers/**/*.router.js', routerFn => {
      rapid.addRouters(routerFn);
    });
  }

  async function resolveRootExtension(name, patterns, fn) {
    for(let p of await rapid.relativeGlob(patterns)) {
      try {
        fn(require(p));
        rapid.log(`Found ${name} ${rapid.relativePath(p)}`)
      } catch(error) {
        rapid.log(`Failed to resolve ${name} "${p}":`, error);
      }
    }
  }

  await findModels();
  await findControllers();
  await findRouters();
}

module.exports = async function autoload(Rapid, rootDir) {
  const rapid = new Rapid(rootDir);
  rapid.addConfigs(loadConfig(rootDir));
  await findAppModules(rapid);
  return rapid;
};
