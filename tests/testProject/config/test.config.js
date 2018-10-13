const uuid = require('uuid/v4');

module.exports = {
  webserver: {
    port: 'auto',
  },
  database: {
    dropWhenFinished: true,
    connection: {
      database: 'rapid_example_test_' + uuid().replace(/-/g, '_'),
    },
  },
};
