// Returns a jest/mocha style `test(string, fn)` function that passes
// a started rapid instance to the test function.
// Automatically closes database/webserver connections and drops the test database once completed
module.exports = function rapidTestWrapper(rapidFn, testFn = test) {
  return async function rapidTest(description, fn) {
    testFn(description, async () => {
      let rapid;
      try {
        rapid = rapidFn();
        await rapid.start();
        rapid.axios = require('axios').create({
          baseURL: `http://127.0.0.1:${rapid.webserver.resolvedPort}`,
          validateStatus: () => true, // don't throw for any status
        });
        await fn(rapid);
      } finally {
        if (rapid) {
          await rapid
            .stop()
            .catch(error => console.log(`Failed to stop ${error}`));
        }
      }
    });
  };
};
