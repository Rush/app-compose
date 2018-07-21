import { Emitter } from 'typed-rx-emitter';
import { Stream } from 'stream';

type Messages = {
  exit: number,
  started: boolean,
  killing: boolean,
  output: Stream
};

export abstract class Process extends Emitter<Messages> {
  constructor() {
    super();
  }

  terminate() {
    return this.kill('SIGKILL');
  }

  abstract kill(signal: 'SIGINT' | 'SIGKILL'): Promise<boolean>;
  async cleanup() { }

  abstract start(): Promise<void>;
};