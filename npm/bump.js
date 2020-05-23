import * as logger from 'https://deno.land/std/log/mod.ts';
import { v4 as uuid } from "https://deno.land/std/uuid/mod.ts";

async function git(commands) {
  const gitRes = Deno.run({
    cmd: ['git', ...commands],
    stdout: "piped",
    stderr: "piped",
  });
  const { code } = await gitRes.status();
  if (code === 0) {
    const rawOutput = await gitRes.output();
    const outStr = new TextDecoder().decode(rawOutput);
    return outStr
  } else {
    const rawError = await gitRes.stderrOutput();
    const errorString = new TextDecoder().decode(rawError);
    logger.error(errorString);
    throw new Error(errorString);
  }
}

async function npm(commands) {
  const npmRes = Deno.run({
    cmd: ['npm', ...commands],
    stdout: "piped",
    stderr: "piped",
  });
  const { code } = await npmRes.status();
  if (code === 0) {
    const rawOutput = await npmRes.output();
    const outStr = new TextDecoder().decode(rawOutput);
    return outStr
  } else {
    const rawError = await npmRes.stderrOutput();
    const errorString = new TextDecoder().decode(rawError);
    logger.error(errorString);
    throw new Error(errorString);
  }
}

async function checkWorkingTreeClean() {
  const gitStatus = await git(['status']);
  return gitStatus.includes('nothing to commit, working tree clean');
}

async function getCurrentBranch() {
  const gitBranch = await git(['branch']);
  return gitBranch
    .split('\n')
    .find((item) => (item.substr(0, 2) === '* '))
    .substr(2);
}

const allowedFileChanges = ['modified:   package-lock.json', 'modified:   package.json'];

async function validatePreCommit() {
  const gitStatus = await git(['status']);
  const res = gitStatus.replace(/\t/gi, '').split('\n');
  // const onBranch = res.find((item) => item.includes('On branch'));
  const modified = res.filter((item) => item.includes('modified:'));
  return modified.reduce((result, item) => {
    if (!result) {
      return result;
    }
    return allowedFileChanges.includes(item);
  }, true);
}

async function bump() {
  logger.info('Running npm ci...');
  const npmCI = await npm(['ci']);
  logger.info('Running npm update...');
  const npmUpdate = await npm(['update']);
  
  logger.info('Validating changes');
  const valid = await validatePreCommit();
  if (!valid) {
    throw new Error('Found upland file changes, only expected changes to package.json and package-lock.json');
  }
  logger.info('Changes are allowed');
}

async function commitChanges(bumpBranchName) {
  // TODO: Y/n show diff
  // TODO: commit? Y/n
  logger.info('Staging changes');
  const gitStage = await git(['add', '.']);
  logger.info('Committing changes');
  const gitCommit = await git(['commit', '-m', 'Bump dependencies, with npm update']);
  logger.info('Pushing to upstream');
  const gitPushUpstream = await git(['push', '--set-upstream', 'origin', bumpBranchName]);
}

async function runner() {
  const isClean = await checkWorkingTreeClean();
  if (isClean) {
    logger.info('Working three clean');
    const startingBranch = await getCurrentBranch();
    logger.info(`Starting branch: ${startingBranch}`);
    // TEMP: assume branch master is head branch.
    const coMaster = await git(['checkout', 'master']);
    logger.info('Checked out master');
    if (!coMaster.includes('Your branch is up to date with')) {
      // TODO: pull;
      const coStartingBranch = await git(['checkout', startingBranch]);
      return logger.error('Master was not up to date, exited');
    }
    const bumpBranchName = `bump-${uuid.generate()}`;
    const coBumpBranch = await git(['checkout', '-b', bumpBranchName]);
    logger.info(`Created bump branch: ${bumpBranchName}`);

    await bump();
    await commitChanges(bumpBranchName);

    const coStartingBranch = await git(['checkout', startingBranch]);
    logger.info(`Checked out starting branch: ${startingBranch}`);

    return logger.info('Bumped deps');
  }
  return logger.error('Working tree is not clean commit your changes before bumping.');
}


runner();
