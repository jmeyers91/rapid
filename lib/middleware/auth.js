const jwtParser = require('koa-jwt');

module.exports = rapid => () => jwtParser(rapid.webserver.config.jwt);
