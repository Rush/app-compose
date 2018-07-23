import Bluebird from 'bluebird';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { isArray, isPlainObject, isString, isUndefined, mapValues } from 'lodash';
import { forkJoin, from, Observable, timer } from 'rxjs';
import { filter, first, map, switchMap } from 'rxjs/operators';
import { colorizeName } from './common';
import { DockerProcess, DockerProcessEntry } from './docker-process';
import { NativeProcessEntry } from './native-process';
import { Process, ProcessEnvironment } from './process';
import { createProcess, registerSigInt } from './process-manager';

const isPortReachable = require('is-port-reachable');

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

interface ComposeAppEntry {
  depends_on?: string[],
  ready?: {
    wait_for_log?: string,
    wait_for_ports?: boolean | string[],
    when_done?: true,
  }
}

interface ComposeAppNative extends ComposeAppEntry, NativeProcessEntry {}
interface ComposeAppDocker extends ComposeAppEntry, DockerProcessEntry {}

type ComposeProcessEntry = ComposeAppNative | ComposeAppDocker;

interface ComposeConfig {
  environment: ProcessEnvironment,
  apps: { [key: string]: ComposeProcessEntry },
}

const env: ProcessEnvironment = Object.assign({}, process.env) as any;

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

const { apps, environment } = loadConfig();
Object.assign(env, environment);

const maxLength = Object.keys(apps)
  .map(appName => appName.length)
  .sort((a, b) => a - b)
  .pop() || 0;

const cwd = process.cwd();

const processes = new Map<string, Process>();

function createProcesses() {
  return Promise.all(Object.keys(apps).map(async appName => {
    const appEntry = apps[appName];

    const proc = await createProcess(appName, cwd, appEntry);
    processes.set(appName, proc);
  }));
}

function setupReadyTriggers(proc: Process, appEntry: ComposeProcessEntry) {
  let triggerRegexp: RegExp;
  let readyObservables$: Observable<void>[] = []
  const appName = proc.name;

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
      let host$: Observable<string>;
      let ports: string[];

      if(proc instanceof DockerProcess) {
        host$ = proc.ipAddress$;
        if (typeof wait_for_ports === 'boolean') {
          ports = proc.dockerTcpPorts
        } else {
          ports = wait_for_ports;
        }
      } else {
        host$ = from([ 'localhost' ]);
        if (typeof wait_for_ports === 'boolean') {
          console.warn(chalk.gray(`${appName} has ready.wait_for_ports set as true but this mode is only supported for docker processes`));
          ports = [];
        }  else {
          ports = wait_for_ports;
        }
      }

      readyObservables$.push(...ports.map(port => {
        return proc.on('started')
          .pipe(switchMap(() => host$))
          .pipe(switchMap(host => {
            return timer(100, 500).pipe(map(() => host));
          }))
          .pipe(switchMap(host => {
            return isPortReachable(port, { host })
          }))
          .pipe(filter(value => {
            return !!value;
          }))
          .pipe(first())
          .pipe(map(_ => {}));
      }));
    }
  }

  const subscription = forkJoin(...readyObservables$).subscribe(async () => {
    proc.triggerReady({ notify: true });
  });

   proc.on('exit').subscribe(() => subscription.unsubscribe());

  if(!readyObservables$.length) {
    proc.on('started').subscribe(() => {
      proc.triggerReady({ notify: false });
    });
  }
}

function startProcesses() {
  const extraEnvironment: ProcessEnvironment = {};

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

    // workaround for SIGINT handler breaking when spawning new native processes
    proc.on('started').pipe(first()).subscribe(() => {
      registerSigInt();
    });

    if('expose_ip' in appEntry && proc instanceof DockerProcess) {
      proc.ipAddress$.subscribe(ipAddress => {
        if(appEntry.expose_ip) {

          console.log(colorizeName(appName), '...',
            `exposed IP address ${ipAddress} as environment variable ${appEntry.expose_ip} to dependant processes`
          );
          extraEnvironment[appEntry.expose_ip] = ipAddress;
        }
      });
    }

    // depends on logic
    if (!dependsOn.length) {
      await proc.start(extraEnvironment);
      return;
    }

    console.log(colorizeName(appName), '...',
      'waiting for', dependsOn.map(colorizeName).join(' '), 'to become ready'
    );

    const isProcess = (process: Process | undefined): process is Process => !!process;
    const readyEvents$ = dependsOn.map((depAppName: string) => {
      if (!processes.has(depAppName)) {
        console.warn(chalk.gray(`${appName} depends on ${depAppName} but it is not defined in the compose file`));
      }
      return processes.get(depAppName);
    })
      .filter(isProcess)
      .map((depProc: Process) => depProc.on('ready').pipe(first()));

    forkJoin(...readyEvents$).subscribe(async () => {
      await proc.start(extraEnvironment);
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