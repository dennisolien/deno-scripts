import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';
import * as fs from './mod.ts';
import { exists } from "https://deno.land/std@0.51.0/fs/mod.ts";

Deno.test({
  name: 'getApplicationFolderPath',
  fn(): void {
    const name = 'testing'
    const path = fs.getApplicationFolderPath(name);
    const home = Deno.env.get('HOME');
    const result = path.replace(home || '', '');
    assertEquals(result, `/.testing`);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'ensureApplicationFolder and deleteApplicationFolder',
  async fn(): Promise<void> {
    const name = 'testingFSDenoScripts';
    const ensureFolder = await fs.ensureApplicationFolder(name);
    const path = fs.getApplicationFolderPath(name);
    const createdDirExists = await exists(path);
    assertEquals(createdDirExists, true);
    await fs.deleteApplicationFolder(name);
    const deletedDirNotExists = await exists(path);
    assertEquals(deletedDirNotExists, false);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});