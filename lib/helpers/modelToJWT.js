module.exports = rapid => {
  const jwt = require('jsonwebtoken');

  return function modelToJWT(model) {
    const { jwtDuration } = rapid.webserver;
    const { secret } = rapid;
    const modelJSON = model.toJSON ? model.toJSON() : model;
    const payload = {
      ...modelJSON,
      exp: Math.floor(Date.now() + jwtDuration) / 1000, // convert to seconds
    };

    return 'Bearer ' + jwt.sign(payload, secret);
  };
};
