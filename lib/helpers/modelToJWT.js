module.exports = rapid => {
  const jwt = require('jsonwebtoken');

  return function modelToJWT(model) {
    const { jwtDuration } = rapid;
    const { secret } = rapid;
    const modelJSON = model.toJSON ? model.toJSON() : model;
    const payload = { ...modelJSON };

    if(jwtDuration) {
      payload.exp = Math.floor(Date.now() + jwtDuration) / 1000;
    }

    return 'Bearer ' + jwt.sign(payload, secret);
  };
};
