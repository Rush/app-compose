import memoizee from 'memoizee';
import {decorate} from 'core-decorators';
const chalk = require('chalk');
const { createHash } = require('crypto');

export function colorizeName(name: string) {
  const hash = createHash('md5').update(name).digest().readUInt32LE(0);
  return chalk.bold.hsl(hash % 360, 100, 50)(name);
}

interface MemoizeArgs {
  promise?: boolean;
  maxAge?: number;
  primitive?: boolean;
  normalizer?: (args: any[]) => string;
  max?: number;
};

export function memoize(options: MemoizeArgs = {}, ...args: any[]) {
  return decorate(memoizee, options, ...args);
}
