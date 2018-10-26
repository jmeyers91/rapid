module.exports = rapid => {
  rapid.io
  .of('/protectedTestNamespace')
  .use(rapid.middleware.socketAuth())
  .on('connection', socket => {
    socket.on('protectedTestNamespaceEvent', () => socket.emit('protectedTestNamespaceEventSuccess', {}));
  });
};