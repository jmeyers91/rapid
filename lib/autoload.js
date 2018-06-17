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

async function resolveAppModules(rapid) {
  async function resolveModels() {
    return resolveRootExtension('model', 'models/**/*.model.js', modelFn => {
      rapid.addModel(modelFn);
    });
  }

  async function resolveControllers() {
    return resolveRootExtension('controller', 'controllers/**/*.controller.js', controllerFn => {
      rapid.addController(controllerFn);
    });
  }

  async function resolveRouters() {
    return resolveRootExtension('router', 'routers/**/*.router.js', routerFn => {
      rapid.addRouter(routerFn)
    });
  }

  async function resolveRootExtension(name, patterns, fn) {
    for(let p of await rapid.globby(patterns)) {
      try {
        fn(require(p));
        rapid.log(`Added ${name} ${rapid.relativePath(p)}`)
      } catch(error) {
        rapid.log(`Failed to resolve ${name} "${p}":`, error);
      }
    }
  }

  await resolveModels();
  await resolveControllers();
  await resolveRouters();
}

module.exports = function autoload(Rapid, rootDir) {
  const rapid = new Rapid(rootDir, loadConfig(rootDir));
  rapid._moduleLoader = resolveAppModules;
  return rapid;
};
