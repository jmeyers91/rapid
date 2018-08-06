const Rapid = require('../lib/Rapid');
const { rapidTest, testProject } = require('./testUtils');

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
    await rapid.database.drop();
  });

  test('Should be able to start and stop multiple instances', async () => {
    const rapid1 = new Rapid(testProject);
    await rapid1.start();
    await rapid1.stop();
    await rapid1.database.drop();

    const rapid2 = new Rapid(testProject);
    await rapid2.start();
    await rapid2.stop();
    await rapid2.database.drop();
  });

  rapidTest('Should run seeds', async rapid => {
    const user = await rapid.models.User.query()
      .where('name', 'Jim')
      .first();
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
    expect(
      /rapid_example_test_.+/.test(rapid.database.config.connection.database)
    ).toBeTruthy();
  });

  rapidTest('Should be able to discover routes', async rapid => {
    const response = await rapid.axios.get('/api/test');
    expect(response.status).toEqual(200);
  });

  rapidTest('Should run seeds', async rapid => {
    const user = await rapid.models.User.query()
      .where('name', 'Jim')
      .first();
    expect(user).toBeTruthy();
  });

  rapidTest('Should run hooks', async rapid => {
    // These should be set in testProject/hooks/testHooks.hook.js
    expect(rapid.rapidWillStart__ran).toEqual(2);
    expect(rapid.databaseWillClear__ran).toEqual(2);
    expect(rapid.databaseDidClear__ran).toEqual(2);
    expect(rapid.databaseWillStart__ran).toEqual(2);
    expect(rapid.databaseDidStart__ran).toEqual(2);
    expect(rapid.webserverWillStart__ran).toEqual(2);
    expect(rapid.webserverDidStart__ran).toEqual(2);
    expect(rapid.migrationsWillRun__ran).toEqual(2);
    expect(rapid.migrationsDidRun__ran).toEqual(2);
    expect(rapid.modelsWillAttach__ran).toEqual(2);
    expect(rapid.modelsDidAttach__ran).toEqual(2);
    expect(rapid.controllersWillAttach__ran).toEqual(2);
    expect(rapid.controllersDidAttach__ran).toEqual(2);
    expect(rapid.routesWillAttach__ran).toEqual(2);
    expect(rapid.routesDidAttach__ran).toEqual(2);
    expect(rapid.seedsWillRun__ran).toEqual(2);
    expect(rapid.seedsDidRun__ran).toEqual(2);
    expect(rapid.webserverWillListen__ran).toEqual(2);
    expect(rapid.webserverDidListen__ran).toEqual(2);
    expect(rapid.rapidDidStart__ran).toEqual(2);
  });

  rapidTest('Should discover models', async rapid => {
    expect(rapid.models.User).toBeTruthy();
    expect(rapid.models.Post).toBeTruthy();
  });

  rapidTest('Should discover controllers', async rapid => {
    expect(rapid.controllers.userController).toBeTruthy();
  });

  rapidTest('Should discover routes', async rapid => {
    const response = await rapid.axios.get('/api/route/test');
    expect(response.status).toEqual(200);
  });

  rapidTest('Should discover actions', async rapid => {
    expect(rapid.actions.testAction).toBeTruthy();
  });

  rapidTest('Actions should be runnable', async rapid => {
    expect(await rapid.actions.testAction({ foo: 'bar' })).toEqual({
      foo: 'bar'
    });
  });

  rapidTest(
    'Actions should validate their props if passed a schema',
    async rapid => {
      const input = { foo: 'abc', bar: 10 };
      expect(await rapid.actions.testActionValidation(input)).toEqual(input);
    }
  );

  rapidTest(
    "Actions should throw props don't match the passed schema",
    async rapid => {
      let error;
      try {
        const input = { foo: 'abc' };
        await rapid.actions.testActionValidation(input);
      } catch (e) {
        error = e;
      }
      expect(error).toBeTruthy();
    }
  );

  rapidTest(
    'Actions should coerce the types of their props if passed a schema',
    async rapid => {
      const input = { foo: 'abc', bar: '10' };
      expect(await rapid.actions.testActionValidation(input)).toEqual({
        foo: 'abc',
        bar: 10
      });
    }
  );
});
