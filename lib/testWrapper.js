
// Returns a jest/mocha style `test(string, fn)` function that passes a started rapid instance to the test function
module.exports = function rapidTestWrapper(rapidFn, testFn=test) {
  return async function rapidTest(description, fn) {
    testFn(description, async () => {
      try {
        var rapid = rapidFn();
        await rapid.start();
        rapid.axios = require('axios').create({
          baseURL: `http://127.0.0.1:${rapid.webserver.config.port}`
        });
        await fn(rapid);
      } finally {
        await rapid.stop();
      }
    });
  };
};
