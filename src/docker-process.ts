import Bluebird from 'bluebird';
import Docker, { Container } from 'dockerode';
import { Subject, Subscription, ReplaySubject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { memoize } from './common';
import { Process, ProcessEnvironment } from './process';
import { resolve as pathResolve, basename, resolve } from 'path';
import { replaceVariablesInObject } from './environment';
import { createHash } from 'crypto';
import { processEnvironment } from './environment';
import { map } from 'rxjs/operators';
import { from } from 'rxjs';

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
}

const makeHash = (data: string) => createHash('sha256').update(data).digest('base64');

function formatBytes(bytes: number, decimals: number) {
  if(bytes == 0) return '0 Bytes';
  const k = 1024,
      dm = decimals || 2,
      sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
      i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function dockerizeEnvironment(environment: ProcessEnvironment) {
  return Object.keys(environment).map(envKey => {
    return `${envKey}=${environment[envKey]}`;
  });
}

interface DockerBaseProgressEvent {
  status: string;
  id: string;
}

interface DockerProgressEvent extends DockerBaseProgressEvent {
  status: 'Downloading' | 'Extracting',
  progressDetail: {
    current: number;
    total: number;
  },
  progress: string;
};

interface DockerCompleteEvent extends DockerBaseProgressEvent {
  status: 'Download complete' | 'Pull complete';
}

export class DockerProcess extends Process {
  container: Container | null = null;
  private subscription: Subscription | null = null;
  private _ipAddress: string|null = null;

  ipAddress$ = new ReplaySubject<string>(1);

  get ipAddress() { return this._ipAddress; }

  private setIpAddress(ipAddress: string) {
    this._ipAddress = ipAddress;
    this.variables.DOCKER_IP = ipAddress;
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
  private async emitStarted() {
    if(!this.container) {
      throw new Error('Container should be set');
    }
    const data = await this.container.inspect();
    const { NetworkSettings: { IPAddress } } = data;
    this.setIpAddress(IPAddress);
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

  @memoize({ promise: true })
  private static async pullImage(image: string) {
    const hasTagRegexp = /\:(?![.-])[a-zA-Z0-9_.-]{1,128}$/
    const imageWithTag = hasTagRegexp.test(image) ? image : `${image}:latest`;
    const stream = await docker.pull(imageWithTag, {});

    type ProgressType = { [key: string]: {
      current: number,
      total: number,
    }}
    const layersProgress = {
      Downloading: {} as ProgressType,
      Extracting: {} as ProgressType,
    };
    const total = (category: 'Downloading' | 'Extracting', type: 'current' | 'total') => {
      return Object.keys(layersProgress[category])
        .map((key: string) => layersProgress[category][key][type])
        .reduce((prev, current) => prev + current, 0);
    };

    const observable = timer(3000, 3000).pipe(map(() => {
      return {
        image,
        downloading: {
          current: total('Downloading', 'current'),
          total: total('Downloading', 'total'),
        },
        extracting: {
          current: total('Extracting', 'current'),
          total: total('Extracting', 'total'),
        }
      }
    }));
    let promise = Bluebird.fromCallback(cb =>{
      docker.modem.followProgress(stream, cb, (event: DockerProgressEvent | DockerCompleteEvent) => {
        if(event.status === 'Downloading' || event.status === 'Extracting') {
          layersProgress[event.status][event.id] = event.progressDetail;
        }
        if(event.status === 'Download complete' || event.status === 'Pull complete') {
          const key = event.status === 'Download complete' ? 'Downloading' : 'Extracting';
          if(layersProgress[key][event.id]) {
            layersProgress[key][event.id].current = layersProgress[key][event.id].total;
          }
        }
      });
    });

    return observable.pipe(takeUntil(from(promise)));
  }

  async prepareContainer(extraEnvironment: ProcessEnvironment) {
    const { environment = {}, ports = [], command, volumes = [], image} = this.options;

    let container: Container;

    const Env = (() => {
      const finalEnvironment = Object.assign({}, extraEnvironment, environment);
      const finalResolvedEnvironment = replaceVariablesInObject(
        finalEnvironment,
        { ...processEnvironment, ...finalEnvironment },
        true
        );
      return dockerizeEnvironment(finalResolvedEnvironment);
    })();

    const PortBindings = Object.assign({}, ...ports.map(this.makeDockerPort, this));
    const ExposedPorts = Object.assign({}, PortBindings);
    Object.keys(ExposedPorts).map((key: string) => {
      ExposedPorts[key] = {};
    });

    ports.map(this.parsePort, this)

    const Binds = volumes.map(this.parseVolume, this);

    const Cmd = command && argvSplit(command);
    const containerName = `ap_${basename(this.cwd)}_${this.name}`;

    const containerOptions = {
      Image: image,
      name: containerName,
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
    };

    const optionsHash = makeHash(JSON.stringify(containerOptions));

    const createContainer = () => {
      return docker.createContainer({
        ...containerOptions,
        Labels: {
          AppComposeOptionsHash: optionsHash
        },
      })
    };

    try {
      container = await docker.getContainer(containerName);
      const { Config: { Labels: { AppComposeOptionsHash } } } = await container.inspect();
      if (AppComposeOptionsHash !== optionsHash) {
        await container.remove({
          force: true
        });
        container = await createContainer();;
      }
    } catch(err) {
      try {
        container = await createContainer();;
      } catch(err2) {
        if(err2.message.match(/No such image/)) {
          // https://stackoverflow.com/a/39672069/403571
          const observable = await DockerProcess.pullImage(image);
          observable.subscribe(status => {
            const message = `Pulling image ${status.image} ` +
            `Downloading: ${formatBytes(status.downloading.current, 2)} / ${formatBytes(status.downloading.total, 2)} ` +
            `Extracting: ${formatBytes(status.extracting.current, 2)} / ${formatBytes(status.extracting.total, 2)}`;
            this.emit('status', message);
          });
          await observable.toPromise();
        }
        container = await createContainer();;
      }
    }
    this.container = container;
    return container;
  }

  async start(extraEnvironment: ProcessEnvironment) {
    const subject = new Subject();

    this.subscription = subject
      .pipe(switchMap(() => this.prepareContainer(extraEnvironment) ))
      .pipe(switchMap(async container => {
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

        return container;
      }))
      .pipe(switchMap(async container => {
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
    // TODO: add an option to always clean up containers in the future
    // await this.container.remove({
    //   force: true
    // });
    this.container = null;
  }
};