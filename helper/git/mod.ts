import * as logger from 'https://deno.land/std/log/mod.ts';
import { denoSubProcessToString } from '../sub_process/mod.ts';

export function gitCommand(commands: string[]) {
  return Deno.run({
    cmd: ['git', ...commands],
    stdout: "piped",
    stderr: "piped",
  });
}

export async function getBranches(remote: boolean = false) {
  const commands = ['branch'];
  if (remote) {
    commands.push('-r');
  }
  const denoRun = gitCommand(commands);
  const result = await denoSubProcessToString(denoRun);

  const branches = result
    .split('\n')
    .filter((item) => !!item)
    .map((item) => item.trim());

  if (remote) {
    return branches.map((item) => item.replace('origin/', ''));
  }
  return branches;
}

export function getCurrentBranch(branches: string[]) {
  const currentBranch = branches.find((item) => (item.substr(0, 2) === '* '));
  if (!currentBranch) {
    throw new Error('Unable to find current branch');
  }
  return currentBranch.substr(2)
}

// TODO: test for this;
export async function currentBranchHaveBeenMerged(remote: boolean = false) {
  const commands = ['branch', '--no-merged', 'master'];
  if (remote) {
    commands.push('-r');
  }
  const denoRun = await gitCommand(commands);
  const result = await denoSubProcessToString(denoRun);
  const isMerged = !result.includes(`* `);
  return isMerged;
}

// TODO: test for this;
export async function checkWorkingTreeClean() {
  const denoRun = await gitCommand(['status']);
  const result = await denoSubProcessToString(denoRun);
  // TODO: do this more dynamic.
  return result.includes('nothing to commit, working tree clean');
}

// TODO: test for this;
export async function checkoutBranch(branchName: string) {
  const commands = ['checkout', branchName];
  const denoRun = await gitCommand(commands);
  const result = await denoSubProcessToString(denoRun);
  // TODO: do this more dynamic.
  const switchedMsg = `Switched to branch '${branchName}'`;
  const alreadyOnMsg = `Already on '${branchName}'`;

  if (!result.includes(switchedMsg) && !result.includes(alreadyOnMsg)) {
    throw new Error(`Was unable to checkout branch: ${branchName}, orgMsg: ${result}`);
  }
  logger.info(`Checkout branch: ${branchName}`);
  return true;
}

// TODO: test for this;
export async function createBranch(branchName: string) {
  const commands = ['checkout', '-b', branchName];
  const denoRun = await gitCommand(commands);
  return denoSubProcessToString(denoRun);
}

// TODO: test for this;
export async function getRemoteOriginPath() {
  const commands = ['remote', '-v'];
  const denoRun = await gitCommand(commands);
  const result = await denoSubProcessToString(denoRun);
  // TODO: use a regEx
  return result.split('\n')[0]
    .replace('origin\t', '')
    .replace('(fetch)', '')
    .replace(' ', '')
    .replace('.git', '');
}