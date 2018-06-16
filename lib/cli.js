#!/usr/bin/env node

const argv = require('yargs').argv;
const path = require('path');
const rootDir = argv.root ? path.resolve(argv.root) :  process.cwd();
const commands = argv._.reduce((commands, key) => {
  commands[key] = true;
  return commands;
}, {});

async function init() {
  const { existsSync, writeFileSync, readFileSync } = require('fs');
  const { exec } = require('child_process');
  const merge = require('lodash/merge');
  const snakeCase = require('lodash/snakeCase');
  const projectName = argv._[1];

  const run = (command, options={}) => new Promise((resolve, reject) => {
    exec(command, options, error => {
      if(error) reject(error);
      else resolve();
    });
  });

  if(!projectName) {
    console.log('Usage: rapid init projectName');
    process.exit(1);
  }
  const projectPath = path.resolve(projectName);
  if(existsSync(projectPath)) {
    console.log(`The file "${projectPath}" already exists`);
    process.exit(1);
  }
  console.log(`Creating Rapid app "${projectName}"`);
  console.log('Cloning...');
  await run(`git clone https://github.com/jmeyers91/rapid-template.git ${projectPath}`);
  
  console.log('Installing dependencies...');
  await run('npm install', {cwd: projectPath});
  
  console.log('Initializing git')
  await run('rm -rf .git', {cwd: projectPath});
  await run('git init', {cwd: projectPath});

  const defaultConfigPath = path.join(projectPath, 'config/config.default.js');
  const configOverrides = {
    DATABASE_NAME: snakeCase(projectName)
  };
  writeFileSync(defaultConfigPath, 
    readFileSync(defaultConfigPath, 'utf8').replace(/\{\{\s*(\S+)\s*\}\}/g, (_, key) => configOverrides[key] || '')
  );
  console.log('Done');
}

async function main() {
  const Rapid = require('./Rapid');

  const rapid = await Rapid.autoload(rootDir);
  let shouldStop = false;
  await rapid.start();
  if(commands.clear) {
    await rapid.database.clear();
    shouldStop = true;
  }
  if(commands.migrate) {
    await rapid.database.migrate();
    shouldStop = true;
  }
  if(commands.seed) {
    await rapid.database.seed();
    shouldStop = true;
  }
  if(!commands.start && shouldStop) {
    await rapid.stop();
    rapid.log('Done');
    process.exit();
  } else {
    rapid.log('Started');
  }
}

async function watch() {
  const nodemon = require('nodemon');
  const args = process.argv.slice(2).filter(s => s !== '--watch');
  const cliExe = path.join(__dirname, 'cli.js');

  nodemon({
    exec: cliExe,
    ext: 'js json',
    watch: [rootDir],
    stdout: true,
    args: args,
    delay: 2000
  });
  
  nodemon.on('start', () => {
    console.log('App has started');
  }).on('quit', () => {
    console.log('App has quit');
    process.exit();
  }).on('restart', files => {
    console.log(`Restarting...\n`);
  });
}

const handleError = error => console.log(error);
if(commands.init) {
  init().catch(handleError);
} else if(argv.watch) {
  watch().catch(handleError);
} else {
  main().catch(handleError);
}
