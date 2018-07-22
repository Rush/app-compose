import Bluebird from 'bluebird';
import chalk from 'chalk';
import { DockerProcess } from './docker-process';
import { NativeProcess } from './native-process';
import { Process, ProcessEnvironment } from './process';
import { take, timeout, catchError } from 'rxjs/operators';
import { from } from 'rxjs';

const processes = new Set<Process>();

export interface NativeProcessEntry {
  command: string;
  environment?: ProcessEnvironment,
};

export interface DockerProcessEntry {
  image: string;
  command?: string;
  environment?: ProcessEnvironment,
  ports?: (string|number)[],
  volumes?: string[],
}

export type ProcessEntry = NativeProcessEntry | DockerProcessEntry;

export function createProcess(cwd: string, processEntry: ProcessEntry): Process {
  if ('image' in processEntry) {
    const proc = new DockerProcess(cwd,
      processEntry.image,
      processEntry.command,
      processEntry.environment,
      processEntry.ports,
      processEntry.volumes,
    );
    processes.add(proc);
    return proc;
  }
  if (!processEntry.command) {
    throw new Error('You need to specify command');
  }

  const proc = new NativeProcess(cwd, processEntry.command, {
    env: processEntry.environment,
  });
  processes.add(proc);
  return proc;
}

enum SigIntStatus {
  SoftExit,
  ForcedExit,
  PanicExit,
};

let sigIntExitStatus: SigIntStatus = SigIntStatus.SoftExit;

async function forcedExitHandler() {
  console.log(chalk.redBright(' Forcing shutdown ... (press Ctrl+C again to exit immediately)'));
  sigIntExitStatus = SigIntStatus.PanicExit;

  await Bluebird.map(processes.values(), async proc => {
    await proc.terminate();
  });
  process.exit(1);
}

async function sigIntHandler() {
  console.log(chalk.whiteBright(' Gracefully stopping... (press Ctrl+C again to force)'));

  switch (+sigIntExitStatus) {
    case SigIntStatus.PanicExit:
      return process.exit(1);
    case SigIntStatus.ForcedExit:
      return forcedExitHandler();
  }

  sigIntExitStatus = SigIntStatus.ForcedExit;

  Bluebird.map(processes.values(), async proc => {
    proc.kill('SIGINT');

    await proc.on('exit').pipe(take(1)).pipe(timeout(5000), catchError(async err => {
      return from(proc.terminate());
    })).toPromise();
  });
}

export function registerSigInt() {
  process.removeListener('SIGINT', sigIntHandler);
  process.on('SIGINT', sigIntHandler);
}
