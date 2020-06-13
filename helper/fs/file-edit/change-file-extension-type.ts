import { ensureDir, ensureFile, emptyDir, exists, walk } from "https://deno.land/std@0.51.0/fs/mod.ts";

/**
 * Change the extensions of files
 * eg a file with `js` => `ts`
 * or change all files in a dir from 'js' => 'ts'
 */

export function changeFileExtension(filePath:string, from:string, to:string) {
  const orgAtFromPos = filePath.substring(filePath.length -from.length);
  if (orgAtFromPos !== from) return null;
  const newPath = `${filePath.substring(0, filePath.length - from.length)}${to}`;
  return Deno.rename(filePath, newPath);
}

export async function changeFileExtensionInDir(dirPath:string, from:string, to:string, maxDepth:number = 1) {
  const fromLength = from.length;
  for await (const entry of walk(dirPath, { maxDepth })) {
    if (entry.isFile) {
      await changeFileExtension(entry.path, from, to);
    }
  }
}