import * as logger from 'https://deno.land/std/log/mod.ts';

/**
 * This has not been optimized in any way. loops in loops, and stuff.
 */

async function ask(question) {
  const buf = new Uint8Array(1024);
  // Write question to console
  await Deno.stdout.write(new TextEncoder().encode(question));

  // Read console's input into answer
  const n = await Deno.stdin.read(buf);
  const answer = new TextDecoder().decode(buf.subarray(0, n));

  if (answer.trim() !== 'y' && answer.trim() !== 'Y') {
    return false;
  }

  return true;
}

async function git(commands) {
  // logger.info(`Debug: commands: ${commands}`);
  const gitRes = Deno.run({
    cmd: ['git', ...commands],
    stdout: "piped",
    stderr: "piped",
  });
  const { code } = await gitRes.status();
  if (code === 0) {
    const rawOutput = await gitRes.output();
    const outStr = new TextDecoder().decode(rawOutput);
    // logger.info(`Debug: res: ${outStr}`);
    return outStr
  } else {
    const rawError = await gitRes.stderrOutput();
    const errorString = new TextDecoder().decode(rawError);
    logger.error(errorString);
    throw new Error(errorString);
  }
}

async function getCurrentBranch() {
  const gitBranch = await git(['branch']);
  return gitBranch
    .split('\n')
    .find((item) => (item.substr(0, 2) === '* '))
    .substr(2);
}

const startingBranch = await getCurrentBranch();
logger.info(`Starting on branch: ${startingBranch}`);

async function getBranches(remote = false) {
  const commands = ['branch'];
  if (remote) {
    commands.push('-r');
  }
  const gitBranch = await git(commands);
  const branches = gitBranch
    .replace('* ', '')
    .split('\n')
    .filter((item) => !!item)
    .map((item) => item.trim());
  if (remote) {
    return branches.map((item) => item.replace('origin/', ''));
  }
  return branches;
}

// False positive if no commits, on branch.
// Check if the current branch 
async function haveBeenMerged(remote = false) {
  const commands = ['branch', '--no-merged', 'master'];
  if (remote) {
    commands.push('-r');
  }
  const gitBranch = await git(commands);
  return !gitBranch.includes(`* `);
}

function diffLocalRemote(local, remote) {
  // If a branch exists locally, but not on the remote.
  // it can be: 
  // 1. have been merged to master
  // 2. not yet committed to the remote.

  const onLocalOnly = local.filter((item) => !remote.includes(item));
  const onRemoteOnly = local.filter((item) => !local.includes(item));
  return {
    onLocalOnly,
    onRemoteOnly,
  }
}

async function checkWorkingTreeClean() {
  const gitStatus = await git(['status']);
  return gitStatus.includes('nothing to commit, working tree clean');
}

async function checkoutBranch(branchName) {
  const gitCo = await git(['checkout', branchName]);
  const switchedMsg = `Switched to branch '${branchName}'`;
  const alreadyOnMsg = `Already on '${branchName}'`;
  if (!gitCo.includes(switchedMsg) || gitCo.includes(alreadyOnMsg)) {
    const fallBackCheck = await getCurrentBranch();
    if (fallBackCheck === branchName) {
      logger.info(`Checkout branch: ${branchName}`);
      return true;
    }
    throw new Error(`Was unable to checkout branch: ${branchName}`);
  }
  logger.info(`Checkout branch: ${branchName}`);
  return true;
}

async function checkBranchClean(branchName) {
  await checkoutBranch(branchName);
  return checkWorkingTreeClean();
}

async function canDelete(branches) {
  return branches
    .reduce(async (res, item) => {
      const result = await res;
      if (item === 'master') {
        return Object.assign(result, {
          master: false,
        });
      }
      const isClean = await checkBranchClean(item);
      if (!isClean) {
        logger.warning(`Branch: ${item}, have uncommitted changes. Skipping delete.`);
      } else {
        logger.info(`Branch: ${item}, working three is clean`);
      }
      const isMerged = isClean ? await haveBeenMerged() : false;
      if (isClean && !isMerged) {
        logger.warning(`Branch: ${item}, have not been merged to master.`);
      } else if (isClean && isMerged) {
        logger.info(`Branch: ${item}, have no unmerged changes`);
      }
      return Object.assign(result, {
        [item]: (isClean && isMerged),
      });
    }, Promise.resolve({}));
}

async function pullMaster() {
  logger.info('checkout master');
  await git(['checkout', 'master']);
  logger.info('pull master');
  await git(['pull']);
  return true;
}

async function deleteBranch(branchNames) {
  const deleted = [];
  for await (const branchName of branchNames) {
    const shouldDelete = await ask(`delete: '${branchName}'? [y/N]: `);
    if (!shouldDelete) {
      logger.info(`Skipping delete branch: '${branchName}'`);
    } else {
      logger.info(`Deleting branch: '${branchName}'`);
      await git(['branch', '-d', branchName]);
      deleted.push(branchName);
    }
  }
  return logger.info(`Deleted branches: ${deleted}`);
}

try {
  const homeClean = await checkWorkingTreeClean();
  if (!homeClean) {
    throw new Error('Working branch is not clean.');
  }
  await pullMaster();
  const local = await getBranches();

  const branches = await canDelete(local);
  
  const toDelete = Object.entries(branches)
    .filter(([branch, bool]) => bool)
    .map(([branch]) => branch);
  
  const notDelete = Object.entries(branches)
    .filter(([branch, bool]) => !bool)
    .map(([branch]) => branch);

  await deleteBranch(toDelete);
  await checkoutBranch(startingBranch);
} catch (error) {
  await checkoutBranch(startingBranch);
  throw error;
}