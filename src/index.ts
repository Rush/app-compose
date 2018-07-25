import Bluebird from 'bluebird';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { forkJoin, from, Observable, timer } from 'rxjs';
import { filter, first, map, switchMap, delay } from 'rxjs/operators';
import { colorizeName } from './common';
import { DockerProcess, DockerProcessEntry } from './docker-process';
import { processEnvironment, replaceVariablesInObject } from './environment';
import { NativeProcessEntry } from './native-process';
import { Process, ProcessEnvironment } from './process';
import { createProcess, registerSigInt } from './process-manager';

import yargs from 'yargs';

const isPortReachable = require('is-port-reachable');
const validateConfig = require('../app-compose.schema');

Bluebird.config({
  longStackTraces: true
});

interface ComposeAppEntry {
  depends_on?: string[],
  ready?: {
    wait_for_log?: string,
    wait_for_ports?: boolean | string[],
    when_done?: true,
  },
  export: ProcessEnvironment,
}

interface ComposeAppNative extends ComposeAppEntry, NativeProcessEntry {}
interface ComposeAppDocker extends ComposeAppEntry, DockerProcessEntry {}

type ComposeProcessEntry = ComposeAppNative | ComposeAppDocker;

interface ComposeConfig {
  environment: ProcessEnvironment,
  apps: { [key: string]: ComposeProcessEntry },
}

function loadConfig(): ComposeConfig {
  const config = yaml.safeLoad(readFileSync('./app-compose.yaml', 'utf8'));
  const valid = validateConfig(config);
  if(!valid) {
    console.error('Error loading app-compose.yaml:');
    console.error(validateConfig.errors.map((error: any) => {
      return `  ${error.keyword} ${error.dataPath} ${error.message}`
    }).join('\n'));
    process.exit(1);
  }
  return config;
}

const { apps, environment } = loadConfig();
Object.assign(processEnvironment, replaceVariablesInObject(environment, processEnvironment));

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

  // should be first ready listener
  proc.on('ready').subscribe(() => {
    Object.assign(proc.exportedEnvironment, replaceVariablesInObject(
      appEntry.export,
      Object.assign({}, processEnvironment, proc.exportedEnvironment, proc.variables)
    ));
  });

  const subscription = forkJoin(...readyObservables$).subscribe(async () => {
    proc.triggerReady({ notify: true });
  });

   proc.on('exit').subscribe(() => subscription.unsubscribe());
   proc.on('killing').subscribe(() => subscription.unsubscribe());

  if(!readyObservables$.length) {
    proc.on('started').subscribe(() => {
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

    proc.on('status').subscribe(message => {
      console.log(colorizeName(appName), '...',
        chalk.yellow(message)
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

    const isProcess = (process: Process | undefined): process is Process => !!process;

    const dependsOn = (appEntry.depends_on || []).filter((depAppName: string) => {
      if (!processes.has(appName)) {
        console.warn(chalk.gray(`${appName} depends on $export {depAppName} but it is not defined in the compose file`));
        return false;
      }
      return true;
    }).map(appName => processes.get(appName)).filter(isProcess);


    setupReadyTriggers(proc, appEntry);

    // workaround for SIGINT handler breaking when spawning new native processes
    proc.on('started').pipe(first()).subscribe(() => {
      registerSigInt();
    });

    if (!dependsOn.length) {
      await proc.start({});
      return;
    }

    console.log(colorizeName(appName), '...',
      'waiting for', dependsOn.map(p => colorizeName(p.name)).join(' '), 'to become ready'
    );

    const readyEvents$ = dependsOn
      .map((depProc: Process) =>
        depProc.on('ready').pipe(first()).pipe(map(() => depProc))
      )

    forkJoin(...readyEvents$)
      .pipe(delay(0))
      .subscribe(async (processes: Process[]) => {
        const exportedEnvironments = processes.map(p => {
          return p.exportedEnvironment;
        });
        const extraEnvironment = Object.assign({}, ...exportedEnvironments);
        Object.assign(proc.exportedEnvironment, extraEnvironment);
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