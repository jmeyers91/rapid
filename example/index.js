const Rapid = require('../lib/Rapid');

const rapid = new Rapid(__dirname);

rapid
  .addConfigs(
    require('./config/config.default'),
    require('./config/config')
  )
  .addModels(
    require('./models/User.model'),
  )
  .addControllers(
    require('./controllers/User.controller'),
  )
  .addRouters(
    require('./routers/Auth.router.js'),
  );

rapid.start().catch(error => console.log(error));

module.exports = rapid;
