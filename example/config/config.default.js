module.exports = {
  webserver: {
    port: 9090
  },
  database: {
    connection: {
      user : process.env.USER || 'root',
      password : '',
      database : 'rapid_example_default'
    }
  }
};
