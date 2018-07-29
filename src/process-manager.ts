import Bluebird from 'bluebird';
import chalk from 'chalk';
import { DockerProcess, DockerProcessEntry } from './docker-process';
import { NativeProcess, NativeProcessEntry } from './native-process';
import { Process } from './process';
import { take, timeout, catchError } from 'rxjs/operators';
import { from, Subject } from 'rxjs';
import { ComposeProcessEntry } from './index';

const processes = new Map<Process, ComposeProcessEntry>();

export type ProcessEntry = NativeProcessEntry | DockerProcessEntry;

export function createProcess(name: string, cwd: string, processEntry: ComposeProcessEntry): Process {
  if ('image' in processEntry) {
    const proc = new DockerProcess(name, cwd, processEntry);
    processes.set(proc, processEntry);
    return proc;
  }
  if (!processEntry.command) {
    throw new Error('You need to specify the command');
  }

  const proc = new NativeProcess(name, cwd, processEntry);
  processes.set(proc, processEntry);
  return proc;
}

export enum SigIntStatus {
  SoftExit,
  ForcedExit,
  PanicExit,
};

let sigIntExitStatus: SigIntStatus = SigIntStatus.SoftExit;

async function forcedExitHandler() {
  console.log(chalk.redBright(' Forcing shutdown ... (press Ctrl+C again to exit immediately)'));
  sigIntExitStatus = SigIntStatus.PanicExit;

  await Bluebird.map(processes.keys(), async proc => {
    await proc.terminate();
  });
  process.exit(1);
}

const subscription = new Subject<SigIntStatus>();

async function sigIntHandler() {
  console.log(chalk.whiteBright(' Gracefully stopping... (press Ctrl+C again to force)'));

  subscription.next(sigIntExitStatus);

  switch (+sigIntExitStatus) {
    case SigIntStatus.PanicExit:
      return process.exit(1);
    case SigIntStatus.ForcedExit:
      return forcedExitHandler();
  }

  sigIntExitStatus = SigIntStatus.ForcedExit;

  Bluebird.map(processes.keys(), async proc => {
    const entry = processes.get(proc);
    proc.kill(entry && entry.quit_signal || 'SIGINT');

    await proc.on('exit').pipe(take(1))
      .pipe(timeout(3000), catchError(async err => {
        proc.kill('SIGTERM');
      }))
      .pipe(timeout(5000), catchError(async err => {
        return from(proc.terminate());
      })).toPromise();
  });
}


export function registerSigInt() {
  process.removeListener('SIGINT', sigIntHandler);
  process.on('SIGINT', sigIntHandler);

  return subscription;
}
