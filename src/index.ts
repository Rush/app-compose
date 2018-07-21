import chalk from 'chalk';
const { readFileSync } = require('fs');

const split = require('split');

import { createProcess, registerSigInt } from './process-manager';

import { colorizeName } from './common';

import yaml from 'js-yaml';
import { onErrorResumeNext } from 'rxjs/operators';

const appSetup = yaml.safeLoad(readFileSync('./app-compose.yaml', 'utf8'));
const { apps } = appSetup;
const maxLength = Object.keys(apps).map(appName => appName.length).sort().shift() || 0;

const appNameSectionLength = (maxLength + 3);

const cwd = process.cwd();

Object.keys(apps).map(async appName => {
  const appEntry = apps[appName];

  const proc = await createProcess(cwd, appEntry);

  proc.on('exit').subscribe(returnCode => {
    console.log(colorizeName(appName), '...',
      returnCode === 0 ? chalk.green('done') : chalk.red(`done with error (${returnCode})`)
    );
  });

  proc.on('started').subscribe(() => {
    console.log(colorizeName(appName), '...',
      chalk.whiteBright('started')
    );
  });

  proc.on('error').subscribe(error => {
    console.log(colorizeName(appName), '...',
      chalk.red('error'), error.message
    );
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

  proc.on('killing').subscribe(signal => {
    if(signal === 'SIGINT') {
      console.log('Sending SIGINT to', colorizeName(appName));
    } else if(signal === 'SIGKILL') {
      console.log('Graceful shutdown failed, sending SIGKILL to', colorizeName(appName));
    }
  });

  await proc.start();
});

setTimeout(() => {
  registerSigInt();
}, 0);