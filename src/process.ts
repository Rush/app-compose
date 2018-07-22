import { Emitter } from 'typed-rx-emitter';
import { Stream } from 'stream';
import { memoize } from './common';
import split from 'split';

type Messages = {
  exit: number,
  started: boolean,
  killing: 'SIGINT' | 'SIGKILL',
  output: Stream,
  error: Error,
  ready: boolean,
  line: string,
};

export type ProcessEnvironment = { [key: string]: string };

export abstract class Process extends Emitter<Messages> {
  private _ended = false;
  get ended() {return this._ended; }

  constructor() {
    super();
    this.on('exit').subscribe(() => this._ended = true);

    this.on('output').subscribe(stream => {
      let isEnded = false;
      stream.once('end', () => {
        isEnded = true;
      });
      stream.pipe(split()).on('data', (line: string) => {
        if (isEnded && !line.length) { return; }
        this.emit('line', line);
      });
    });
  }

  terminate() {
    return this.kill('SIGKILL');
  }

  @memoize()
  triggerReady({ notify }: {notify: boolean} ) {
    this.emit('ready', notify);
  }

  abstract kill(signal: 'SIGINT' | 'SIGKILL'): Promise<boolean>;
  async cleanup() { }

  abstract start(): Promise<void>;
};