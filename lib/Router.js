module.exports = rapid => {
  const KoaRouter = require('koa-router');

  return class Router extends KoaRouter {};
};
