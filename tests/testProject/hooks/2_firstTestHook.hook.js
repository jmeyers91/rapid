
module.exports = {
  runOrder: 1,

  rapidWillStop(rapid) {
    rapid.rapidWillStop__ran = 1;
  },

  rapidDidStop(rapid) {
    rapid.rapidDidStop__ran = 1;
  },

  rapidWillStart(rapid) {
    rapid.rapidWillStart__ran = 1;
  },

  databaseWillClear(rapid) {
    rapid.databaseWillClear__ran = 1;
  },

  databaseDidClear(rapid) {
    rapid.databaseDidClear__ran = 1;
  },

  databaseWillStart(rapid) {
    rapid.databaseWillStart__ran = 1;
  },

  databaseDidStart(rapid) {
    rapid.databaseDidStart__ran = 1;
  },

  webserverWillStart(rapid) {
    rapid.webserverWillStart__ran = 1;
  },

  webserverDidStart(rapid) {
    rapid.webserverDidStart__ran = 1;
  },

  rollbackWillRun(rapid) {
    rapid.rollbackWillRun__ran = 1;
  },

  rollbackDidRun(rapid) {
    rapid.rollbackDidRun__ran = 1;
  },

  migrationsWillRun(rapid) {
    rapid.migrationsWillRun__ran = 1;
  },

  migrationsDidRun(rapid) {
    rapid.migrationsDidRun__ran = 1;
  },

  modelsWillAttach(rapid) {
    rapid.modelsWillAttach__ran = 1;
  },

  modelsDidAttach(rapid) {
    rapid.modelsDidAttach__ran = 1;
  },

  controllersWillAttach(rapid) {
    rapid.controllersWillAttach__ran = 1;
  },

  controllersDidAttach(rapid) {
    rapid.controllersDidAttach__ran = 1;
  },

  routersWillAttach(rapid) {
    rapid.routersWillAttach__ran = 1;
  },

  routersDidAttach(rapid) {
    rapid.routersDidAttach__ran = 1;
  },

  seedsWillRun(rapid) {
    rapid.seedsWillRun__ran = 1;
  },

  seedsDidRun(rapid) {
    rapid.seedsDidRun__ran = 1;
  },

  webserverWillListen(rapid) {
    rapid.webserverWillListen__ran = 1;
  },

  webserverDidListen(rapid) {
    rapid.webserverDidListen__ran = 1;
  },

  rapidDidStart(rapid) {
    rapid.rapidDidStart__ran = 1;
  },
};
