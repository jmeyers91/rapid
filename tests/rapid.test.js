const path = require('path');
const Rapid = require('../lib/Rapid');
const testProject = path.join(__dirname, 'testProject');
const createTestRapid = config => {
  return new Rapid(testProject, config).clear().migrate().seed().autoload();
};
const rapidTest = Rapid.test(createTestRapid);
const axios = require('axios');

describe('Rapid', () => {

  test('Should be a test environment', () => {
    expect(process.env.NODE_ENV).toEqual('test');
  });

  test('Should be able to create an instance', () => {
    new Rapid(testProject);
  });

  test('Should be able to start and stop an instance', async () => {
    const rapid = new Rapid(testProject);
    await rapid.start();
    await rapid.stop();
  });

  test('Should be able to start and stop multiple instances', async () => {
    const rapid1 = new Rapid(testProject);
    await rapid1.start();
    await rapid1.stop();

    const rapid2 = new Rapid(testProject);
    await rapid2.start();
    await rapid2.stop();
  });

  rapidTest('Should not be able to view changes between tests', async rapid => {
    await rapid.models.Post.query().insert([
      {title: 'Test post', content: 'test post content'},
    ]);
  });

  rapidTest('Should not be able to view changes between tests (VERIFY)', async rapid => {
    const post = await rapid.models.Post.query().where('title', 'Test post').first();
    expect(post).toBeFalsy();
  });

  rapidTest('Should run seeds', async rapid => {
    const user = await rapid.models.User.query().where('name', 'Jim').first();
    expect(user).toBeTruthy();
  });

  rapidTest('Should be able to discover models', async rapid => {
    expect(rapid.models).toBeTruthy();
    expect(rapid.models.User).toBeTruthy();
    expect(rapid.models.Post).toBeTruthy();
  });

  rapidTest('Should be able to discover controllers', async rapid => {
    expect(rapid._config.webserver.port).toEqual(10123);
  });

  rapidTest('Should be able to discover config', async rapid => {
    expect(rapid._config.database.connection.database).toEqual('rapid_example');
  });

  rapidTest('Should use test database', async rapid => {
    expect(rapid.database.config.connection.database).toEqual('rapid_example_test');
  });

  rapidTest('Should be able to discover routes', async rapid => {
    const response = await rapid.axios.get('/api/test');
    expect(response.status).toEqual(200);
  });
});
