import { readFileStr } from 'https://deno.land/std@0.51.0/fs/mod.ts';
import * as sub from '../sub_process/mod.ts';
import * as babylon from 'https://cdn.pika.dev/babylon@^6.18.0';

export async function getAST(filePath:string) {
  const sourceCode = await readFileStr(filePath, { encoding: "utf8" });
  const parsed = babylon.parse(sourceCode, {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    plugins: [
      "objectRestSpread",
    ]
  });
  return parsed;
}

export async function getASTBody(ast:any) {
  return ast.program.body;
}

/**
 * Pipe out to node, to do the code generation.
 * 
 * WARNING: I hate this, but im not writing my own generator,
 * and i cant make the babel one work for Deno, it will take to long.
 * 
 * TODO: this will not work, as is unless the project is cloned down.
 * need to install the node script, in a temp/project folder. so that no setup is needed
 * by the user.
 * 
 * I need to find a better way of create AST and code form AST
 */
export async function codeFromAST(ast:string) {
  const ast64 = btoa(JSON.stringify(ast));
  const pathToNodeAstToCode = `${import.meta.url}/../../../node-js-code-gen/index.js`.replace('file://', '');
  const nodeRun = await sub.run(['node', pathToNodeAstToCode, ast64]);
  const { code } = await nodeRun.status();
  if (code === 0) {
    const output = await nodeRun.output();
    const outputString = new TextDecoder().decode(output);
    return outputString
  }
  const errOutput = await nodeRun.stderrOutput();
  const errorOutputString = new TextDecoder().decode(errOutput);
  return errorOutputString
}