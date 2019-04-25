module.exports = rapid => {
  const jwt = require('jsonwebtoken');

  return function modelToJWT(model) {
    const { jwtDuration } = rapid;
    const { secret } = rapid;
    let modelJSON;

    if (typeof model.toJWT === 'function') {
      modelJSON = model.toJWT();
    } else if (typeof model.toJSON === 'function') {
      modelJSON = model.toJSON();
    } else {
      modelJSON = model;
    }

    const payload = { ...modelJSON };

    if (jwtDuration) {
      payload.exp = Math.floor((Date.now() + jwtDuration) / 1000);
    }

    return 'Bearer ' + jwt.sign(payload, secret);
  };
};
