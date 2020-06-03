import { ensureDir, emptyDir } from "https://deno.land/std@0.51.0/fs/mod.ts";

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