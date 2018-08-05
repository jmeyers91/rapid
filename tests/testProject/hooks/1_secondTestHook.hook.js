module.exports = rapid => ({
  rapidWillStop() {
    rapid.rapidWillStop__ran++;
  },

  rapidDidStop() {
    rapid.rapidDidStop__ran++;
  },

  rapidWillStart() {
    rapid.rapidWillStart__ran++;
  },

  databaseWillClear() {
    rapid.databaseWillClear__ran++;
  },

  databaseDidClear() {
    rapid.databaseDidClear__ran++;
  },

  databaseWillStart() {
    rapid.databaseWillStart__ran++;
  },

  databaseDidStart() {
    rapid.databaseDidStart__ran++;
  },

  webserverWillStart() {
    rapid.webserverWillStart__ran++;
  },

  webserverDidStart() {
    rapid.webserverDidStart__ran++;
  },

  rollbackWillRun() {
    rapid.rollbackWillRun__ran++;
  },

  rollbackDidRun() {
    rapid.rollbackDidRun__ran++;
  },

  migrationsWillRun() {
    rapid.migrationsWillRun__ran++;
  },

  migrationsDidRun() {
    rapid.migrationsDidRun__ran++;
  },

  modelsWillAttach() {
    rapid.modelsWillAttach__ran++;
  },

  modelsDidAttach() {
    rapid.modelsDidAttach__ran++;
  },

  controllersWillAttach() {
    rapid.controllersWillAttach__ran++;
  },

  controllersDidAttach() {
    rapid.controllersDidAttach__ran++;
  },

  routesWillAttach() {
    rapid.routesWillAttach__ran++;
  },

  routesDidAttach() {
    rapid.routesDidAttach__ran++;
  },

  seedsWillRun() {
    rapid.seedsWillRun__ran++;
  },

  seedsDidRun() {
    rapid.seedsDidRun__ran++;
  },

  webserverWillListen() {
    rapid.webserverWillListen__ran++;
  },

  webserverDidListen() {
    rapid.webserverDidListen__ran++;
  },

  rapidDidStart() {
    rapid.rapidDidStart__ran++;
  }
});

module.exports.runOrder = 10;
