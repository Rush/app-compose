import Bluebird from 'bluebird';
import Docker, { Container } from 'dockerode';
import { Subject, Subscription, ReplaySubject, timer } from 'rxjs';
import { switchMap, takeUntil, mergeMap, toArray, tap, take } from 'rxjs/operators';
import { memoize } from './common';
import { Process, ProcessEnvironment, ProcessSignals } from './process';
import { resolve as pathResolve, basename, resolve } from 'path';
import { replaceVariablesInObject } from './environment';
import { createHash } from 'crypto';
import { processEnvironment } from './environment';
import { map } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { spawn } from 'child_process';
import split from 'split';
import crypto from 'crypto';
import hasha from 'hasha';

const argvSplit = require('argv-split');

const docker = new Docker({
  Promise: Bluebird as any
});

export interface DockerProcessEntry {
  image: string;
  build?: {
    context: string;
    dockerfile: string;
    trigger_files?: string[];
  },
  command?: string;
  entrypoint?: string;
  environment?: ProcessEnvironment;
  ports?: (string|number)[],
  volumes?: string[],
  cwd?: string,
}

const makeHash = (data: string) => createHash('sha256').update(data).digest('base64');

function makeImageWithTag(image: string) {
  const hasTagRegexp = /\:(?![.-])[a-zA-Z0-9_.-]{1,128}$/
  return hasTagRegexp.test(image) ? image : `${image}:latest`;
}

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

const dockerVolumeRegexp = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+/;

type BuildImageParams = {
  tagName: string;
  dockerFile: string;
  contextDir: string;
  labels: {[tagName: string]: string},
};

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
    const hostPort = m[1];
    const sourcePort = m[2] || hostPort;
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

    const isNamedVolume = source.match(dockerVolumeRegexp);

    return {
      source: isNamedVolume ? source : pathResolve(this.cwd, source),
      target,
      isNamedVolume,
    };
  }

  private static async buildImage({tagName, dockerFile, contextDir, labels}: BuildImageParams) {
    const labelArgs = Object.keys(labels).map((labelKey: string) =>
      [`--label`, `${labelKey}=${labels[labelKey]}`]
    ).reduce((a, b) => a.concat(b), []);

    const args = [ 'build', ...labelArgs, '-t', tagName, '-f', dockerFile, contextDir];
    const proc = spawn('docker', args);

    type OutputEvent = { line: string, type: 'stdout'|'stderr' };
    const observable = new Subject<OutputEvent>();
    const isEnded = new Subject();
    proc.stdout.once('end', () => isEnded.next());
    proc.stderr.once('end', () => isEnded.next());

    proc.stdout.pipe(split()).on('data', (line: string) => {
      observable.next({ line, type: 'stdout' });
    });
    proc.stderr.pipe(split()).on('data', (line: string) => {
      observable.next({ line, type: 'stderr' });
    });

    proc.on('exit', (code) => {
      observable.complete();
    })
    proc.on('error', err => {
      observable.error(err);
    });

    return observable
      .pipe(takeUntil(isEnded))
      .pipe(tap({
        complete() {
          proc.kill();
        }
      }));
  }

  @memoize({ promise: true })
  private static async createNamedVolume(volume: string) {
    return docker.createVolume({
      Name: volume,
    });
  }

  @memoize({ promise: true })
  private static async pullImage(imageWithTag: string) {
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
        image: imageWithTag,
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

  private get dockerPrefix() {
    return `ap_${basename(this.cwd)}_`;
  }

  makeVolumeDefinitions(volumes: string[]) {
    const Volumes: {[key: string]: {}} = {};
    const Binds: string[] = [];
    const namedVolumes: string[] = [];
    volumes.forEach(volume => {
      const isEmptyVolume = /^\/[^:]+/.test(volume);
      if (isEmptyVolume) {
        Volumes[volume] = {};
      } else {
        const { source, target, isNamedVolume } = this.parseVolume(volume);
        if(isNamedVolume) {
          Binds.push(`${this.dockerPrefix}${source}:${target}`);
          namedVolumes.push(`${this.dockerPrefix}${source}`);
          Volumes[target] = {};
        } else {
          Binds.push(`${source}:${target}`);
        }
      }
    });
    return { Volumes, Binds, namedVolumes };
  }

  async prepareContainer(extraEnvironment: ProcessEnvironment) {
    const { environment = {}, ports = [], command, volumes = [], image, cwd, entrypoint } = this.options;

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

    const { Volumes, Binds, namedVolumes } = this.makeVolumeDefinitions(volumes);
    for(let namedVolume of namedVolumes) {
      this.emit('status', `Mounting named volume ${namedVolume}`)
      await DockerProcess.createNamedVolume(namedVolume);
    }

    // .slice is needed as argvSplit is returning its global array
    const Cmd = command && argvSplit(command).slice(0);
    const Entrypoint = entrypoint && argvSplit(entrypoint).slice(0);
    const containerName = `${this.dockerPrefix}${this.name}`;

    const imageWithTag = makeImageWithTag(image);

    const isMissingContainerError = (err: Error) => err.message.match(/No such container/);
    const isMissingImageError = (err: Error) => err.message.match(/No such image/);

    const dockerImage = docker.getImage(imageWithTag)
    let dockerImageInfo: Docker.ImageInspectInfo;
    try {
      dockerImageInfo = await dockerImage.inspect();
    } catch(err) {
      if (!isMissingImageError(err)) {
        throw err;
      }
      this.emit('status', `Pulling image ${imageWithTag}`);
      const observable = await DockerProcess.pullImage(imageWithTag);
      observable.subscribe(status => {
        const message = `Pulling image ${status.image} ` +
        `Downloading: ${formatBytes(status.downloading.current, 2)} / ${formatBytes(status.downloading.total, 2)} ` +
        `Extracting: ${formatBytes(status.extracting.current, 2)} / ${formatBytes(status.extracting.total, 2)}`;
        this.emit('status', message);
      });
      await observable.toPromise();
      this.emit('status', 'Pull complete')
      dockerImageInfo = await dockerImage.inspect();
    }

    const containerOptions: Docker.ContainerCreateOptions = {
      Image: dockerImageInfo.Id,
      name: containerName,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Cmd,
      Entrypoint,
      OpenStdin: true,
      Env,
      StdinOnce: false,
      WorkingDir: cwd,
      ExposedPorts,
      Volumes,
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

    container = docker.getContainer(containerName);
    try {
      const { Config: { Labels: { AppComposeOptionsHash } } } = await container.inspect();
      if (AppComposeOptionsHash !== optionsHash) {
        await container.remove({
          force: true
        });
        this.emit('status', `Creating container ${containerName}`);
        container = await createContainer();
      } else {
        this.emit('status', `Re-using existing container ${containerName}`);
      }
    } catch(err) {
      if(isMissingContainerError(err)) {
        this.emit('status', `Creating container ${containerName}`);
        container = await createContainer();
      } else {
        throw err;
      }
    }
    this.container = container;
    return container;
  }

  prepare() {
    const { image, build } = this.options;
    if (!build) {
      return of();
    }

    const files = [ build.dockerfile, ...(build.trigger_files || []) ];

    return from(files).pipe(mergeMap(async (file: string) => {
        const hash = await hasha.fromFile(pathResolve(this.cwd, file), { algorithm: 'md5' });
        return {
          [`md5:${file}`]: hash
        };
      })).pipe(toArray()).pipe(switchMap(async hashes => {
        const labelsToAssign = Object.assign({}, ...hashes);

        try {
          const imageWithTag = makeImageWithTag(image);
          const dockerImage = docker.getImage(imageWithTag);
          const { ContainerConfig: { Labels: existingLabels = {} } } = await dockerImage.inspect();
          const diffLabels = Object.keys(labelsToAssign).filter(label => {
            return labelsToAssign[label] !== existingLabels[label];
          });
          const removeMd5Prefix = (x: string) => x.replace(/^md5:/, '');
          const changedFiles = diffLabels.map(removeMd5Prefix);
          if (!changedFiles.length) {
            this.emit('status', `Skipping ${image} build as the trigger file${files.length > 1 ? 's' : ''} did not change since last build: ${files.join(' ')}`);
            return of();
          }
          this.emit('status', `Rebuilding ${image} due to changes in file${changedFiles.length > 1 ? 's' : ''}: ${changedFiles.join(' ')}`);
        } catch(err) {
          console.error('Error', err);
        }

        const observable = await DockerProcess.buildImage({
          tagName: image,
          dockerFile: build.dockerfile,
          contextDir: build.context,
          labels: labelsToAssign,
        });

        observable.subscribe(({line, type}) => {
            this.emit('status', line);
        });

        return observable;
      })).pipe(switchMap(x => x));
  }

  async start(extraEnvironment: ProcessEnvironment) {
    this.subscription = of(true)
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
  }

  async kill(signal: ProcessSignals) {
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