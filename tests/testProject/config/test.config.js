const uuid = require('uuid/v4');

module.exports = () => ({
  socketIO: true,
  webserver: {
    port: 'auto',
  },
  database: {
    dropWhenFinished: true,
    connection: {
      database: 'rapid_test_' + uuid().replace(/-/g, '_'),
    },
  },
});
