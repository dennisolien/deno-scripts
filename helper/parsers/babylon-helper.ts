import { readFileStr } from 'https://deno.land/std@0.51.0/fs/mod.ts';
import * as babylon from 'https://cdn.pika.dev/babylon@^6.18.0';

function resolveStringLiteral(value:any) {
  return value.value;
}

function resolveLiteral(value:any) {
  return value.value;
}

function resolveIdentifier(value:any) {
  return value.name;
}

function resolveMemberExpression(value:any) {
  const object = value.object;
  const val:any = object.type === 'Identifier' ? object.name : resolveValue(object);
  return `${val}.${value.property.name}`;
}

function resolveArrayExpression(value:any) {
  return value.elements.map((item:any) => {
    return resolveValue(item);
  });
}

function resolveObjectExpression(value:any) {
  return value.properties.reduce((result:any, curr:any) => {
    const key = curr.key.name;
    const val = resolveValue(curr.value);
    return Object.assign(result, {
      [key]: val,
    });
  }, {});
}

function resolveObjectProperty(value:any):any {
  const val = resolveValue(value.value);
  return {
    [value.key.name]: val,
  };
}


export function resolveValue(value:any) {
  if (value.type === 'ArrayExpression') {
    return resolveArrayExpression(value);
  }
  if (value.type === 'ObjectExpression') {
    return resolveObjectExpression(value);
  }
  if (value.type === 'ObjectProperty') {
    return resolveObjectProperty(value);
  }
  if (value.type === 'MemberExpression') {
    return resolveMemberExpression(value);
  }
  if (value.type === 'Literal') {
    return resolveLiteral(value);
  }
  if (value.type === 'StringLiteral') {
    return resolveStringLiteral(value);
  }
  if (value.type === 'Identifier') {
    return resolveIdentifier(value);
  }
  if (value.type === 'BooleanLiteral') {
    return value.value;
  }
  if (value.type === 'NumericLiteral') {
    return value.value;
  }
  if (value.type === 'ArrowFunctionExpression') {
    return 'ArrowFunctionExpression';
  }
  throw new Error(`Can not resolve mongo model expression: ${value.type}`);
} 

export async function getASTBody(filePath:string) {
  const sourceCode = await readFileStr(filePath, { encoding: "utf8" });
  const parsed = babylon.parse(sourceCode, {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    plugins: [
      "objectRestSpread",
    ]
  });
  return parsed.program.body;
}