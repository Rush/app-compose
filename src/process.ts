import { Emitter } from 'typed-rx-emitter';
import { Stream } from 'stream';
import { memoize } from './common';
import split from 'split';
import { Subscription, Observable } from 'rxjs';
import { of } from 'rxjs'

export type ProcessSignals = 'SIGINT' | 'SIGKILL' | 'SIGTERM';

type Messages = {
  exit: number;
  started: boolean;
  killing: ProcessSignals;
  output: Stream;
  error: Error;
  ready: boolean;
  line: string;
  status: string;
};

export type ProcessEnvironment = { [key: string]: string|number|boolean };

export abstract class Process extends Emitter<Messages> {
  private _ended = false;
  get ended() {return this._ended; }
  get name() { return this._name; }

  private _exportedEnvironment: ProcessEnvironment = {};
  get exportedEnvironment() { return this._exportedEnvironment; }

  private _variables: ProcessEnvironment = {};
  get variables() { return this._variables; }

  constructor(private _name: string) {
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

  abstract kill(signal: ProcessSignals): Promise<boolean>;

  async cleanup() { }

  abstract start(extraEnvironment: ProcessEnvironment): Promise<void>;

  prepare() {
    return of();
  }
};