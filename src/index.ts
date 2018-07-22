import Bluebird from 'bluebird';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { isArray, isPlainObject, isString, isUndefined, mapValues } from 'lodash';
import { forkJoin, Observable, timer } from 'rxjs';
import { take, filter, switchMap, map, skipUntil, first } from 'rxjs/operators';
import { colorizeName } from './common';
import { Process, ProcessEnvironment } from './process';
import { createProcess, registerSigInt, NativeProcessEntry, DockerProcessEntry, ProcessEntry } from './process-manager';
import { DockerProcess } from './docker-process';
import { promisify } from 'util';
import { connect } from 'net';

const isPortReachable = require('is-port-reachable');
const connectAsync = promisify(connect);

Bluebird.config({
  longStackTraces: true
});

const mapValuesDeep = (obj: any, fn: any): any => {
  if (isArray(obj)) {
    return obj.map((elem, idx) => {
      if (isString(elem)) {
        return fn(elem, idx, obj);
      } else if(isPlainObject(elem) || isArray(elem)) {
        return mapValuesDeep(elem, fn);
      } else {
        return elem;
      }
    });
  }

  return mapValues(obj, (val, key) =>
    (isPlainObject(val) || isArray(val))
      ? mapValuesDeep(val, fn)
      : fn(val, key, obj)
  );
}

const env: ProcessEnvironment = Object.assign({}, process.env) as any;

interface ComposeAppEntry {
  depends_on?: string[],
  ready?: {
    wait_for_log?: string,
    wait_for_ports?: boolean,
    when_done?: true,
  }
}

interface ComposeAppNative extends ComposeAppEntry, NativeProcessEntry {}
interface ComposeAppDocker extends ComposeAppEntry, DockerProcessEntry {}

type ComposeProcessEntry = ComposeAppNative | ComposeAppDocker;

interface ComposeConfig {
  apps: { [key: string]: ComposeProcessEntry },
}

function loadConfig(): ComposeConfig {
  const appSetup = yaml.safeLoad(readFileSync('./app-compose.yaml', 'utf8'));

  const mappedConfig = mapValuesDeep(appSetup, (value: any, key: string, object: any) => {
    if (isString(value)) {
      value = value.replace(/\$(?:([a-zA-Z_]+[a-zA-Z0-9_]*)|{([a-zA-Z_]+[a-zA-Z0-9_]*)})/g, (_, variable: string) => {
        let substitutedValue = env[variable] as any;
        if (isUndefined(env[variable])) {
          console.warn(chalk.gray(`Subtituted environment variable ${variable} but it's not defined in the host environment. Substituting with an empty string.`));
          substitutedValue = '';
        }
        return substitutedValue;
      });
    }
    return value;
  });
  return mappedConfig;
}

const { apps } = loadConfig();

const maxLength = Object.keys(apps)
  .map(appName => appName.length)
  .sort((a, b) => a - b)
  .pop() || 0;

// const appNameSectionLength = (maxLength + 3);

const cwd = process.cwd();

const processes = new Map<string, Process>();

function createProcesses() {
  return Promise.all(Object.keys(apps).map(async appName => {
    const appEntry = apps[appName];

    const proc = await createProcess(cwd, appEntry);
    processes.set(appName, proc);
  }));
}

function setupReadyTriggers(proc: Process, appEntry: ComposeProcessEntry) {
  let triggerRegexp: RegExp;
  let readyObservables$: Observable<void>[] = []

  if(appEntry.ready) {
    const { wait_for_log, wait_for_ports, when_done } = appEntry.ready;
    if (wait_for_log && typeof wait_for_log == 'string') {
      triggerRegexp = new RegExp(wait_for_log);

      readyObservables$.push(proc.on('line')
        .pipe(filter(line => triggerRegexp.test(line)))
        .pipe(first())
      );
    }
    if (when_done) {
      readyObservables$.push(proc.on('exit').pipe(first()));
    }
    if (wait_for_ports) {
      if(proc instanceof DockerProcess) {
        const ports = proc.dockerTcpPorts;
        readyObservables$.push(...ports.map(port => {
          return timer(100, 500)
            .pipe(skipUntil(proc.on('started')))
            .pipe(filter(() => {
              return !!proc.ipAddress;
            }))
            .pipe(switchMap(() => isPortReachable(port, { host: proc.ipAddress })))
            .pipe(filter(value => {
              return !!value;
            }))
            .pipe(first())
            .pipe(map(_ => {}));
        }));
      }
    }
  }

  forkJoin(...readyObservables$).subscribe(async () => {
    proc.triggerReady({ notify: true });
  });

  if(!readyObservables$.length) {
    proc.on('started').subscribe(() => {
      console.log("Trigger ready", appEntry);
      proc.triggerReady({ notify: false });
    });
  }
}

function startProcesses() {
  Object.keys(apps).map(async appName => {
    const appEntry = apps[appName];
    const proc = processes.get(appName);
    if (!proc) {
      return;
    }

    proc.on('exit').subscribe(returnCode => {
      console.log(colorizeName(appName), '...',
        returnCode === 0 ? chalk.green('done') : chalk.red(`done with error (${returnCode})`)
      );
    });

    proc.on('started').subscribe(() => {
      console.log(colorizeName(appName), '...',
        chalk.whiteBright('started')
      );
    });

    proc.on('ready').subscribe(notify => {
      if (notify) {
        console.log(colorizeName(appName), '...',
          chalk.whiteBright('ready')
        );
      }
    });

    proc.on('error').subscribe(error => {
      console.log(colorizeName(appName), '...',
        chalk.red('error'), error.message
      );
    });

    proc.on('line').subscribe(line => {
      console.log(`${colorizeName(appName)}${' '.repeat(maxLength - appName.length)} | ${line}`);
    });

    proc.on('killing').subscribe(signal => {
      if (signal === 'SIGINT') {
        console.log('Sending SIGINT to', colorizeName(appName));
      } else if (signal === 'SIGKILL') {
        console.log('Graceful shutdown failed, sending SIGKILL to', colorizeName(appName));
      }
    });

    const dependsOn = (appEntry.depends_on || []).filter((depAppName: string) => {
      if (!processes.has(depAppName)) {
        console.warn(chalk.gray(`${appName} depends on ${depAppName} but it is not defined in the compose file`));
        return false;
      }
      return true;
    });

    setupReadyTriggers(proc, appEntry);

    if (!dependsOn.length) {
      await proc.start();
      return;
    }

    console.log(colorizeName(appName), '...',
      'waiting for', dependsOn.map(colorizeName).join(' '), 'to become ready'
    );

    const isProcess = (process: Process | undefined): process is Process => !!process;

    // workaround for SIGINT handler breaking when spawning new native processes
    proc.on('started').pipe(first()).subscribe(() => {
      registerSigInt();
    });

    const readyEvents$ = dependsOn.map((depAppName: string) => {
      if (!processes.has(depAppName)) {
        console.warn(chalk.gray(`${appName} depends on ${depAppName} but it is not defined in the compose file`));
      }
      return processes.get(depAppName);
    })
      .filter(isProcess)
      .map((depProc: Process) => depProc.on('ready').pipe(first()));

    forkJoin(...readyEvents$).subscribe(async () => {
      await proc.start();
    });
  });
}

async function start() {
  registerSigInt();
  await createProcesses();
  registerSigInt();
  await startProcesses();
  registerSigInt();
}

start();