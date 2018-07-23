import Bluebird from 'bluebird';
import Docker, { Container } from 'dockerode';
import { Subject, Subscription, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { memoize } from './common';
import { Process, ProcessEnvironment } from './process';
import { resolve as pathResolve } from 'path';

const argvSplit = require('argv-split');

const docker = new Docker({
  Promise: Bluebird as any
});

export interface DockerProcessEntry {
  image: string;
  command?: string;
  environment?: ProcessEnvironment;
  ports?: (string|number)[],
  volumes?: string[],
  expose_ip?: string,
}

export class DockerProcess extends Process {
  container: Container | null = null;
  private subscription: Subscription | null = null;
  private _ipAddress: string|null = null;

  ipAddress$ = new ReplaySubject<string>(1);

  get ipAddress() { return this._ipAddress; }

  private setIpAddress(ipAddress: string) {
    this._ipAddress = ipAddress;
    this.ipAddress$.next(this._ipAddress);
  }

  get dockerTcpPorts() {
    const { ports = [] } = this.options;
    return ports.map(this.parsePort, this)
      .filter(portDef => portDef.protocol === 'tcp')
      .map(portDef => portDef.sourcePort);
  }

  constructor(
    name: string,
    private cwd: string,
    private options: DockerProcessEntry,
  ) {
    super(name);
  }

  @memoize()
  private emitStarted() {
    this.emit('started', true);
  }

  private parsePort(portDefinition: string | number) {
    const m = portDefinition.toString().match(/^(\d+)(?::(\d+))?(?:\/(tcp|udp|sctp))?$/);
    if(!m) {
      throw new Error(`Cannot parse port definition: ${portDefinition}`);
    }
    const sourcePort = m[1];
    const hostPort = m[2] || sourcePort;
    const protocol = m[3] || 'tcp';

    return { sourcePort, hostPort, protocol };
  }

  private makeDockerPort(portDefinition: string | number) {
    const { sourcePort, hostPort, protocol } = this.parsePort(portDefinition);

    return {
      [`${sourcePort}/${protocol}`]: [{
        HostPort: `${hostPort}`,
        HostIP: '0.0.0.0',
      }]
    };
  }

  private parseVolume(volumeDefinition: string) {
    const m = volumeDefinition.match(/^([^:]+)\:(.+)$/);
    if(!m) {
      throw new Error(`Cannot parse volume definition: ${volumeDefinition}`);
    }
    const [,source, target] = m;

    return `${pathResolve(this.cwd, source)}:${target}`;
  }

  async start(extraEnvironment: ProcessEnvironment) {
    const { environment = {}, ports = [], command, volumes = [], image} = this.options;

    const subject = new Subject();
    let container: Container;

    const finalEnvironment = Object.assign({}, environment, extraEnvironment);

    const Env = Object.keys(finalEnvironment).map(envKey => {
      return `${envKey}=${environment[envKey]}`;
    });

    const PortBindings = Object.assign({}, ...ports.map(this.makeDockerPort, this));
    const ExposedPorts = Object.assign({}, PortBindings);
    Object.keys(ExposedPorts).map((key: string) => {
      ExposedPorts[key] = {};
    });

    ports.map(this.parsePort, this)

    const Binds = volumes.map(this.parseVolume, this);

    this.subscription = subject
      .pipe(switchMap(async () => {
        const Cmd = command && argvSplit(command);
        container = await docker.createContainer({
          Image: image,
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
          Cmd,
          OpenStdin: true,
          Env,
          StdinOnce: false,
          WorkingDir: '/app',
          ExposedPorts,
          HostConfig: {
            PortBindings,
            Binds,
          }
        });
        this.container = container;
      }))
      .pipe(switchMap(async () => {
        const containerStream = await container.attach({ stream: true, stdout: true, stderr: true, hijack: true });
        containerStream.once('data', () => {
          this.emitStarted();
        });
        containerStream.on('end', async () => {
          const { State: { ExitCode } } = await container.inspect();
          this.emit('exit', ExitCode);
          await this.cleanup();
        });

        this.emit('output', containerStream);
      }))
      .pipe(switchMap(async () => {
        await container.start();
        this.emitStarted();
        const data = await container.inspect();
        const { NetworkSettings: { IPAddress } } = data;

        this.setIpAddress(IPAddress);
      }))
      .subscribe({
        error: err => {
          this.emit('error', err);
        }
      });

    subject.next();
  }

  async kill(signal: 'SIGINT' | 'SIGKILL') {
    this.subscription && this.subscription.unsubscribe();
    if (this.ended || !this.container) {
      return false;
    }
    this.emit('killing', signal);
    try {
      await this.container.kill({
        signal
      });
    } catch(err) {}

    if (signal === 'SIGKILL') {
      await this.cleanup();
    }
    return true;
  };

  @memoize({ promise: true })
  async cleanup() {
    if (!this.container) {
      return;
    }
    await this.container.remove({
      force: true
    });
    this.container = null;
  }
};