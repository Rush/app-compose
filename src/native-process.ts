import Bluebird from 'bluebird';
import * as pty from 'node-pty';
import { IPty } from 'node-pty';
import { platform } from 'os';
import { Stream } from 'stream';
import { Process, ProcessEnvironment, ProcessSignals } from './process';
import { processEnvironment, replaceVariablesInObject } from './environment';
import { takeUntil } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

const terminate = Bluebird.promisify<Promise<null>, number>(require('terminate'));

const termColumns = process.stdout.columns || 80;
const termRows = process.stdout.rows || 30;

const shell = platform() === 'win32' ? 'powershell.exe' : '/bin/sh';

interface ProcessEnv {
  [key: string]: string;
}

export interface NativeProcessEntry {
  command: string;
  environment?: ProcessEnvironment,
};

interface SpawnOptions {
  columns?: number;
  rows?: number;
  env?: { [index: string]: string };
};

function spawnRaw(cwd: string, command: string, args: string[], options: SpawnOptions = {}) {
  const proc = pty.spawn(command, args, {
    name: 'xterm-color',
    cols: options.columns || 80,
    rows: options.rows || 30,
    cwd,
    env: Object.assign({}, processEnvironment, options.env) as ProcessEnv,
  });

  return proc;
}

export function spawn(cwd: string, command: string, options: SpawnOptions = {}) {
  return spawnRaw(cwd, shell, ['-c', command], options);
}

export class NativeProcess extends Process {
  proc: IPty | null = null;

  constructor(name: string, private cwd: string, private options: NativeProcessEntry) {
    super(name);
  }

  async start(extraEnvironment: ProcessEnvironment) {
    const { command, environment } = this.options;
    const finalEnvironment = Object.assign({}, extraEnvironment, environment);

    this.proc = spawn(this.cwd, command, {
      env: replaceVariablesInObject(finalEnvironment, finalEnvironment, true),
    });
    this.emit('started', true);
    this.emit('output', this.proc as any as Stream);
    const exitObservable = new Subject();

    this.proc.on('exit', exitCode => {
      this.emit('exit', exitCode);
      exitObservable.next();
    });
  }

  async kill(signal: ProcessSignals) {
    if (this.ended || !this.proc) {
      return false;
    }
    this.emit('killing', signal);
    this.proc.kill(signal);
    if (signal === 'SIGKILL') {
      await this.cleanup();
    }
    return true;
  };

  async cleanup() {
    if (!this.proc || this.ended) {
      return;
    }
    try {
      await terminate(this.proc.pid);
    } catch (err) { }
  }
};