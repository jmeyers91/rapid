const RapidApp = require('../lib/Rapid');

async function main() {
  const app = await new RapidApp(__dirname).start();
}

main().catch(error => console.log(error));
