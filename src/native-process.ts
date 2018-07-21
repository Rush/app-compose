import { Process } from './process';
import Docker from 'dockerode';
import Bluebird from 'bluebird';
import { ProcessEnv, ITerminal } from 'node-pty/lib/interfaces';
import { platform } from 'os';
const terminate = Bluebird.promisify<Promise<null>, number>(require('terminate'));

const termColumns = process.stdout.columns || 80;
const termRows = process.stdout.rows || 30;

import * as pty from 'node-pty';

const argvSplit = require('argv-split');

const shell = platform() === 'win32' ? 'powershell.exe' : '/bin/sh';

const docker = new Docker({
  Promise: Bluebird as any
});


interface SpawnOptions {
  columns?: number;
  rows?: number;
  env?: { [index:string]: string };
};

function spawnRaw(cwd:string, command:string, args:string[], options:SpawnOptions = {}) {
  const proc = pty.spawn(command, args, {
      name: 'xterm-color',
      cols: options.columns || 80,
      rows: options.rows || 30,
      cwd,
      env: options.env || process.env as ProcessEnv,
    });

  return proc;
}

export function spawn(cwd:string, command:string, options:SpawnOptions = {}) {
  return spawnRaw(cwd, shell, [ '-c', command ], options);
}

export class NativeProcess extends Process {
  proc: ITerminal | null = null;

  constructor(private cwd:string, private command:string, private options:SpawnOptions) {
    super();
  }

  async start() {
    this.proc = spawn(this.cwd, this.command, this.options);
  }

  async kill(signal: string) {
    if(signal === 'SIGINT') {
      this.emit('killing', true);
    }
    await this.cleanup();
    return true;
  };
};