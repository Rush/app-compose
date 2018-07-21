import Bluebird from 'bluebird';

import { Process } from './process';

Bluebird.config({
  longStackTraces: true
});

import chalk from 'chalk';
import { DockerProcess } from './docker-process';
import { NativeProcess } from './native-process';

const processes = new Set<Process>();

interface AppEntry {
  image?: string;
  command?: string;
}

export function createProcess(cwd:string, appEntry:AppEntry) : Process {
  if(appEntry.image) {
    const proc = new DockerProcess(cwd, appEntry.image, appEntry.command);
    processes.add(proc);
    return proc;
  }
  if(!appEntry.command) {
    throw new Error('You need to specify command');
  }

  const proc = new NativeProcess(cwd, appEntry.command, {});
  processes.add(proc);
  return proc;
}


function registerForcedExit() {
  process.once('SIGINT', async () => {
    console.log(chalk.red(' Forcing shutdown'));
    process.on('SIGINT', async () => {
      process.exit(0);
    });

    Bluebird.map(processes.values(), async proc => {
      await proc.terminate();
    });
    process.exit(0);
  });
}

export function registerSigInt() {
  console.log('Registering SIGINT');
  process.once('SIGINT', async () => {
    setTimeout(registerForcedExit, 100);
    console.log('Gracefully stopping... (press Ctrl+C again to force)');

    Bluebird.map(processes.values(), async proc => {
      await proc.kill('SIGINT');
      return new Bluebird(resolve => {
        proc.on('exit').subscribe(async () => {
          await proc.cleanup();
          resolve();
        });
      }).timeout(3000).catch(Bluebird.TimeoutError, async () => {
        proc.terminate();
      });
    });
  });
}
