import * as logger from 'https://deno.land/std/log/mod.ts';
import { denoSubProcessToString } from '../sub_process/mod.ts';

export function npmCommand(commands: string[]) {
  return Deno.run({
    cmd: ['npm', ...commands],
    stdout: "piped",
    stderr: "piped",
  });
}