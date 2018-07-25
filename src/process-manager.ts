import Bluebird from 'bluebird';
import chalk from 'chalk';
import { DockerProcess, DockerProcessEntry } from './docker-process';
import { NativeProcess, NativeProcessEntry } from './native-process';
import { Process } from './process';
import { take, timeout, catchError } from 'rxjs/operators';
import { from } from 'rxjs';

const processes = new Set<Process>();

export type ProcessEntry = NativeProcessEntry | DockerProcessEntry;

export function createProcess(name: string, cwd: string, processEntry: ProcessEntry): Process {
  if ('image' in processEntry) {
    const proc = new DockerProcess(name, cwd, processEntry);
    processes.add(proc);
    return proc;
  }
  if (!processEntry.command) {
    throw new Error('You need to specify the command');
  }

  const proc = new NativeProcess(name, cwd, processEntry);
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
