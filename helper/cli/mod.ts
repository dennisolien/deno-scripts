import { parse } from 'https://deno.land/std@0.51.0/flags/mod.ts';

export const getParsedArgs = () => parse(Deno.args);

export function getParams(parsedArgs:any) {
  return parsedArgs._;
}

export function getFlags(parsedArgs:any) {
  const {_, ...rest} = parsedArgs;
  return rest;
}

export async function ask(question:string) {
  const buf = new Uint8Array(1024);
  // Write question to console
  await Deno.stdout.write(new TextEncoder().encode(question));

  // Read console's input into answer
  const n = await Deno.stdin.read(buf);
  if (n) {
    const answer = new TextDecoder().decode(buf.subarray(0, n));
    return answer.trim();
  }
  throw new Error('No answer given.')
}