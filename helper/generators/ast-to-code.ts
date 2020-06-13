import { readFileStr } from 'https://deno.land/std@0.51.0/fs/mod.ts';
// import generate from 'https://cdn.pika.dev/@babel/generator@^7.10.2'; // does not work on deno, node funcs.
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



export async function codeFromAST(ast:string) {
  // const { code } = generate(ast); // Can not get it to work on Deno
}