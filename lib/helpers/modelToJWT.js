module.exports = rapid => {
  const jwt = require('jsonwebtoken');

  return function modelToJWT(model) {
    const modelJSON = model.toJSON ? model.toJSON() : model;
    return 'Bearer ' + jwt.sign(modelJSON, rapid.webserver.config.jwt.secret)
  };
};
