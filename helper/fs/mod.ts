import { ensureDir, ensureFile, emptyDir } from "https://deno.land/std@0.51.0/fs/mod.ts";
import { run } from '../sub_process/mod.ts';

export function getApplicationFolderPath(name:string) {
  const homeDir = Deno.env.get('HOME');
  return `${homeDir}/.${name}`;
}

export function getApplicationSubFolderPath(applicationName:string, folderName: string) {
  const applicationPath = getApplicationFolderPath(applicationName);
  return `${applicationPath}/${folderName}`;
}

export function ensureApplicationFolder(name:string) {
  const applicationDir = getApplicationFolderPath(name);
  return ensureDir(applicationDir);
}

export async function deleteApplicationFolder(name:string) {
  const applicationDir = getApplicationFolderPath(name);
  await emptyDir(applicationDir);
  return Deno.remove(applicationDir);
}

export function createApplicationSubFolder(applicationName: string, folderName: string) {
  const subFolderPath = getApplicationSubFolderPath(applicationName, folderName);
  return ensureDir(subFolderPath);
}

/**
 * Open a filePath in a editor, vim by default.
 * eg. await editFile('/Users/username/README.md', 'code');
 */
export async function editFile(filePath: string, openCommand?: string) {
  await ensureFile(filePath);
  // TODO: check os, and use os terminal editor.
  const openWith = openCommand ? openCommand : 'vim';
  const commands = [openWith, filePath];
  const open = Deno.run({
    cmd: commands,
  });
  
  return open.status();
}

