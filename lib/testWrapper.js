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

        // Only resolve these values if they're used
        lazyGetter(rapid, 'axios', () => {
          const axios = require('axios');
          return axios.create({
            baseURL: `http://127.0.0.1:${rapid.webserver.resolvedPort}`,
            validateStatus: () => true, // don't throw for any status
          });
        });

        lazyGetter(rapid, 'io', () => {
          const io = require('socket.io-client');

          return (namespace, ...rest) => (
            io(`http://localhost:${rapid.webserver.resolvedPort}${namespace || ''}`, ...rest)
          );
        });

        await fn(rapid);
      } finally {
        if (rapid) {
          if(rapid._socket) {
            rapid._socket.close();
          }
          rapid
            .stop()
            .catch(error => console.log(`Failed to stop ${error}`));
        }
      }
    });
  };

  function lazyGetter(object, key, fn) {
    let run = false;
    let value;
    Object.defineProperty(object, key, {
      get() {
        if(!run) {
          value = fn();
          run = true;
        }
        return value;
      }
    });
  }
};
