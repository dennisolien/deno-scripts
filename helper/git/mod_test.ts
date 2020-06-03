import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';
import * as sub from '../sub_process/mod.ts';
import * as git from './mod.ts';

Deno.test({
  name: 'denoSubProcessToString',
  async fn(): Promise<void> {
    const denoRun = git.gitCommand(['remote', '-v']);
    const result = await sub.denoSubProcessToString(denoRun);
    // TODO: this can change, how to best test? could create a temp git repo.
    const shouldInclude = 'origin	git@github.com:';
    assertEquals(result.includes(shouldInclude), true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'getBranches',
  ignore: true,
  async fn(): Promise<void> {
    const branches = await git.getBranches();
    // TODO: how to check that this work?
    // I could create a temp git repo before, and delete after.
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'gitGetCurrentBranch',
  async fn(): Promise<void> {
    const branches = await git.getBranches();
    const branch = git.getCurrentBranch(branches);
    // TODO: how to check that this work?
    // I could create a temp git repo before, and delete after.
    if (!branch ) {
      throw Error('No branch');
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});