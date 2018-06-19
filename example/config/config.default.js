module.exports = {
  webserver: {
    port: 8080
  },
  database: {
    connection: {
      user : process.env.USER || 'root',
      password : '',
      database : 'rapid_example'
    }
  }
};
