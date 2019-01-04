module.exports = rapid => {
  rapid.io.of('/testNamespace').on('connection', socket => {
    socket.on('testNamespaceEvent', () =>
      socket.emit('testNamespaceEventSuccess', {}),
    );
  });
};
