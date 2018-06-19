const Rapid = require('../lib/Rapid');

const rapid = new Rapid(__dirname);

rapid
  .addConfigs(
    'config/config.default.js',
    'config/config.js'
  )
  .addModels('models/**.model.js')
  .addControllers('controllers/**.controller.js')
  .addRouters('routers/**.router.js');

rapid.start().catch(error => console.log(error));

module.exports = rapid;
