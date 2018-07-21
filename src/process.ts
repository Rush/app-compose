import { Emitter } from 'typed-rx-emitter';
import { Stream } from 'stream';

type Messages = {
  exit: number,
  started: boolean,
  killing: 'SIGINT' | 'SIGKILL',
  output: Stream,
  error: Error,
};

export abstract class Process extends Emitter<Messages> {
  private _ended = false;
  get ended() {return this._ended; }

  constructor() {
    super();
    this.on('exit').subscribe(() => this._ended = true);
  }

  terminate() {
    return this.kill('SIGKILL');
  }

  abstract kill(signal: 'SIGINT' | 'SIGKILL'): Promise<boolean>;
  async cleanup() { }

  abstract start(): Promise<void>;
};