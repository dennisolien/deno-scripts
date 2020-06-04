import * as logger from 'https://deno.land/std/log/mod.ts';
import { v4 as uuid } from 'https://deno.land/std/uuid/mod.ts';
import * as fs from '../helper/fs/mod.ts';
import * as git from '../helper/git/mod.ts';
import * as sub from '../helper/sub_process/mod.ts';
import * as npm from '../helper/npm/mod.ts';

const localBranches = await git.getBranches();
const startingBranch = git.getCurrentBranch(localBranches);
logger.info(`Starting on branch ${startingBranch}`);

const workingThreeIsClean = await git.checkWorkingTreeClean();

if (!workingThreeIsClean) {
  logger.error('Working three is not clean, commit or stash your changes, Exiting');
  Deno.exit(1);
}
logger.info('Working three is clean');

// Assume master is main branch
logger.info('Checking out master');
if (startingBranch !== 'master') {
  await git.checkoutBranch('master');
}

logger.info('Pulling master');
const gitPullRun = await git.gitCommand(['pull']);
const gitPullString = await sub.denoSubProcessToString(gitPullRun);

const bumpBranchName = `bump-${uuid.generate()}`;
await git.createBranch(bumpBranchName);
logger.info(`Created new branch ${bumpBranchName}`);

async function bump() {
  logger.info('Running "npm ci"');
  const npmCiRun = await npm.npmCommand(['ci']);
  const npmCiString = await sub.denoSubProcessToString(npmCiRun);
  logger.info('Running "npm update"');
  const npmUpdateRun = await npm.npmCommand(['update']);
  const npmUpdateString = await sub.denoSubProcessToString(npmUpdateRun);
  return true;
}

async function validateChanges() {
  logger.info('Validating changes');
  const allowedFileChanges = ['modified:   package-lock.json', 'modified:   package.json'];
  const gitStatusRun = await git.gitCommand(['status']);
  const gitStatusString = await sub.denoSubProcessToString(gitStatusRun);
  const gitStatusParsed = gitStatusString.replace(/\t/gi, '').split('\n');
  const gitFilesModified = gitStatusParsed.filter((item) => item.includes('modified:'));
  const gitLegalModified = gitFilesModified.reduce((result, item) => {
    if (!result) {
      return result;
    }
    return allowedFileChanges.includes(item);
  }, true);

  if (!gitLegalModified) {
    throw new Error('Unexpected changes to working three, exiting...');
    Deno.exit(1);
  }
  return true;
}

async function push() {
  logger.info('Staging changes');
  const gitAddRun = await git.gitCommand(['add', '.']);
  const gitAddString = await sub.denoSubProcessToString(gitAddRun);

  logger.info('Committing changes');
  const gitCommitRun = await git.gitCommand(['commit', '-m', 'Bump dependencies, with npm update']);
  const gitCommitString = await sub.denoSubProcessToString(gitCommitRun);

  logger.info('Pushing to remote');
  const gitPushRun = await git.gitCommand(['push', '--set-upstream', 'origin', bumpBranchName]);
  const gitPushString = await sub.denoSubProcessToString(gitPushRun);
  return true;
}

await bump();
await validateChanges();
await push();

logger.info('Checking out starting branch')
await git.checkoutBranch(startingBranch);

// TODO: create PR