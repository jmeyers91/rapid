module.exports = rapid => {
  const jwt = require('jsonwebtoken');

  return function modelToJWT(model) {
    const { secret } = rapid.webserver;
    const modelJSON = model.toJSON ? model.toJSON() : model;
    return 'Bearer ' + jwt.sign(modelJSON, secret);
  };
};
