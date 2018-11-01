module.exports = rapid => {
  const jwt = require('jsonwebtoken');

  return function modelToJWT(model) {
    const { secret, jwtDuration } = rapid.webserver;
    const modelJSON = model.toJSON ? model.toJSON() : model;
    const payload = { ...modelJSON, exp: Date.now() + jwtDuration };

    return 'Bearer ' + jwt.sign(payload, secret);
  };
};
