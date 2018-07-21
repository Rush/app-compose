import { Process } from './process';
import { switchMap } from 'rxjs/operators';
import Docker from 'dockerode';
import { Container } from 'dockerode';
import Bluebird from 'bluebird';
import { Subscription, Subject } from 'rxjs';
import { memoize } from './common';

const argvSplit = require('argv-split');

const docker = new Docker({
  Promise: Bluebird as any
});

export class DockerProcess extends Process {
  container: Container | null = null;
  private subscription: Subscription | null = null;

  constructor(private cwd:string, private image:string, private command:string|undefined) {
    super();
  }

  @memoize()
  private emitStarted() {
    this.emit('started', true);
  }

  async start() {
    const subject = new Subject();
    let container: Container;

    this.subscription = subject
      .pipe(switchMap(async () => {
        const Cmd = this.command && argvSplit(this.command);
        container = await docker.createContainer({
          Image: this.image,
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
          Cmd,
          OpenStdin: true,
          StdinOnce: false,
          WorkingDir: this.cwd || '/app',
          HostConfig: {
            Binds: [
              `${process.cwd()}:/app`
            ]
          }
        });
        this.container = container;
      }))
      .pipe(switchMap(async () => {
        const containerStream = await container.attach({stream: true, stdout: true, stderr: true, hijack: true});
        containerStream.once('data', () => {
          this.emitStarted();
        });
        containerStream.on('end', async () => {
          const { State: { ExitCode }} = await container.inspect();
          this.emit('exit', ExitCode);
          await this.cleanup();
        });

        this.emit('output', containerStream);
      }))
      .pipe(switchMap(async () => {
        await container.start();
        this.emitStarted();
      }))
      .subscribe({
        error: err => {
          this.emit('error', err);
        }
      });

    subject.next();
  }

  async kill(signal: 'SIGINT' | 'SIGKILL') {
    if(this.ended) {
      return false;
    }
    this.emit('killing', signal);
    this.subscription && this.subscription.unsubscribe();
    if(signal === 'SIGKILL') {
      await this.cleanup();
    }
    return true;
  };

  @memoize({ promise: true })
  async cleanup() {
    if(!this.container) {
      return;
    }
    await this.container.remove({
      force: true
    });
  }
};