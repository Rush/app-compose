import Bluebird from 'bluebird';
import * as pty from 'node-pty';
import { ITerminal, ProcessEnv } from 'node-pty/lib/interfaces';
import { platform } from 'os';
import { Stream } from 'stream';
import { Process, ProcessEnvironment } from './process';

const terminate = Bluebird.promisify<Promise<null>, number>(require('terminate'));

const termColumns = process.stdout.columns || 80;
const termRows = process.stdout.rows || 30;

const shell = platform() === 'win32' ? 'powershell.exe' : '/bin/sh';

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
    env: Object.assign({}, process.env, options.env) as ProcessEnv,
  });

  return proc;
}

export function spawn(cwd: string, command: string, options: SpawnOptions = {}) {
  return spawnRaw(cwd, shell, ['-c', command], options);
}

export class NativeProcess extends Process {
  proc: ITerminal | null = null;

  constructor(name: string, private cwd: string, private options: NativeProcessEntry) {
    super(name);
  }

  async start(extraEnvironment: ProcessEnvironment) {
    const { command, environment } = this.options;
    const finalEnvironment = Object.assign({}, environment, extraEnvironment);

    this.proc = spawn(this.cwd, command, {
      env: finalEnvironment,
    });
    this.emit('started', true);
    this.emit('output', this.proc as any as Stream);
    this.proc.once('exit', exitCode => {
      this.emit('exit', exitCode);
    });
  }

  async kill(signal: 'SIGINT' | 'SIGKILL') {
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