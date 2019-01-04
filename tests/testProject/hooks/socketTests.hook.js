module.exports = {
  async rapidDidStart(rapid) {
    rapid.io.on('connection', socket => {
      socket.on('test', () => {
        socket.emit('success', { foo: 'bar' });
      });
    });
  },
};
