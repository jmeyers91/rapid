const RapidApp = require('../index');

async function main() {
  const app = await new RapidApp(__dirname).start();
  app.log('Started!');
  console.log(await app.database.createSeed('do the thing'));
}

main().catch(error => console.log(error));
