module.exports = rapid => {
  const SocketIO = require('socket.io');
  const SocketIOClient = require('socket.io/lib/client');
  const Configurable = require('./Configurable');

  return class SocketServer extends Configurable {
    async start() {
      const { httpServer } = rapid.webserver;
      const io = SocketIO(httpServer, this.config);
      this.Client = SocketIOClient;
      rapid.io = io;
    }

    async stop() {
      if(rapid.io) {
        await new Promise(resolve => rapid.io.close(resolve));
      }
    }
  };
};
