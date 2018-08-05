module.exports = {
  webserver: {
    port: 10123
  },
  database: {
    connection: {
      user: process.env.USER || 'root',
      password: '',
      database: 'rapid_default'
    }
  }
};
