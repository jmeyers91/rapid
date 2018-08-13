async function main() {
  const Rapid = require('../../lib/Rapid');
  await new Rapid(__dirname)
    .clear()
    .migrate()
    .seed()
    .autoload()
    .start();
}

main();
