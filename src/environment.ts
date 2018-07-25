import chalk from 'chalk';
import { isArray, isPlainObject, isString, isUndefined, mapValues } from 'lodash';
import { ProcessEnvironment } from './process';

export const processEnvironment: ProcessEnvironment = Object.assign({}, process.env) as any;

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

function replaceVariablesInString(str: string, variables: ProcessEnvironment, replaceWithEmpty: boolean = true) {
  return str.replace(/\$(?:([a-zA-Z_]+[a-zA-Z0-9_]*)|{([a-zA-Z_]+[a-zA-Z0-9_]*)})/g, (wholeMatch, variable: string) => {
    let substitutedValue = variables[variable] as any;
    if (isUndefined(variables[variable])) {
      if (replaceWithEmpty) {
        console.warn(chalk.gray(`Subtituted environment variable ${variable} but it's not defined in the host environment. Substituting with an empty string.`));
        substitutedValue = '';
      }
      else {
        return wholeMatch;
      }
    }
    return substitutedValue;
  });
}

export function replaceVariablesInObject(obj: any, variables: ProcessEnvironment, replaceWithEmpty: boolean = true) {
  const mappedConfig = mapValuesDeep(obj, (value: any, key: string, object: any) => {
    if (isString(value)) {
      value = replaceVariablesInString(value, variables, replaceWithEmpty);
    }
    return value;
  });
  return mappedConfig;
}