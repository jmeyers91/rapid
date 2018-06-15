#!/usr/bin/env node

const Rapid = require('./Rapid');
const argv = require('yargs').argv;
const cwd = process.cwd();

const commands = argv._.reduce((commands, key) => {
  commands[key] = true;
  return commands;
}, {});

async function main() {
  const rapid = await new Rapid(cwd);

  if(commands.refresh || commands.clear) await rapid.database.drop();
  if(commands.refresh || commands.migrate) await rapid.database.migrate();
  if(commands.refresh || commands.seed) await rapid.database.seed();
  if(commands.start) await rapid.start();
  if(commands.stop || !commands.start) await rapid.stop();
}

main().catch(error => console.log(error));
