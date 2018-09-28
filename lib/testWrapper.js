// Returns a jest/mocha style `test(string, fn)` function that passes
// a started rapid instance to the test function.
// Automatically closes database/webserver connections and drops the test database once completed
module.exports = function rapidTestWrapper(rapidFn, testFn = test) {
  return async function rapidTest(description, fn) {
    testFn(description, async () => {
      try {
        var rapid = rapidFn();
        await rapid.start();
        rapid.axios = require('axios').create({
          baseURL: `http://127.0.0.1:${rapid.webserver.config.port}`,
          validateStatus() {
            // don't throw for any status
            return true;
          }
        });
        await fn(rapid);
      } finally {
        if (rapid) {
          await rapid
            .stop()
            .catch(error => console.log(`Failed to stop ${error}`));

          await rapid.database
            .drop()
            .catch(error => console.log(`Failed to drop ${error}`));
        }
      }
    });
  };
};
