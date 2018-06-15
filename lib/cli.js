#!/usr/bin/env node

const Rapid = require('./Rapid');
const argv = require('yargs').argv;
const cwd = process.cwd();

async function main() {
  const rapid = await new Rapid(cwd).start();
}

main().catch(error => console.log(error));
