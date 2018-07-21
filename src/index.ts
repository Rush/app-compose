const chalk = require('chalk');
const { readFileSync } = require('fs');

const split = require('split');

import { createProcess, registerSigInt } from './process-manager';

import { colorizeName } from './common';

import yaml from 'js-yaml';

const appSetup = yaml.safeLoad(readFileSync('./app-compose.yaml', 'utf8'));
const { apps } = appSetup;
const maxLength = Object.keys(apps).map(appName => appName.length).sort().shift() || 0;

const appNameSectionLength = (maxLength + 3);

const cwd = process.cwd();

Object.keys(apps).map(async appName => {
  const appEntry = apps[appName];

  const proc = await createProcess(cwd, appEntry);

  await proc.start();

  proc.on('exit').subscribe(() => {
    console.log(colorizeName(appName), '...', chalk.green('done'));
  });

  proc.on('output').subscribe(stream => {
    let isEnded = false;
    stream.once('end', () => {
      isEnded = true;
    });

    stream.pipe(split()).on('data', (line: string) => {
      if(isEnded && !line.length) { return; }
      console.log(`${colorizeName(appName)}${' '.repeat(maxLength - appName.length)} | ${line}`);
    });
  });

  // proc.once('sendingSIGINT', () => {
  //   console.log('Sending SIGINT to', colorizeName(appName));
  // });
  // proc.once('forcefulKill', () => {
  //   console.log('Graceful shutdown failed, sending SIGKILL to', colorizeName(appName));
  // });
});

setTimeout(() => {
  registerSigInt();
}, 0);