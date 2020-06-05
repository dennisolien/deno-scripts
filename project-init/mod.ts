import { copy, emptyDir } from "https://deno.land/std@0.51.0/fs/mod.ts";
import * as cli from '../helper/cli/mod.ts';
import * as fs from '../helper/fs/mod.ts';
import * as sub from '../helper/sub_process/mod.ts';

const args = cli.getParsedArgs();
const params = cli.getParams(args);
const flags = cli.getFlags(args);

interface NodeConfig {
  express?: boolean;
  graphql?: boolean;
  mongo?: boolean;
}

interface UserConfig {
  runtime: string;
  isNode: boolean;
  isDeno: boolean;
  node?: NodeConfig;
}

async function getRuntime() {
  const qa = (await cli.ask('Use node[n] or deno[d]? [N/d]:  ')).toLocaleLowerCase();
  // Node is default, only node and deno is possible. if input and not deno, always node.
  return (qa === 'd' || qa === 'deno') ? 'deno' : 'node';
}

// TEMP: Only if node;
async function useExpress() {
  const qa = (await cli.ask('Use express? [Y/n]:  ')).toLocaleLowerCase();
  // Node is default, only node and deno is possible. if input and not deno, always node.
  return (qa === 'n' || qa === 'no') ? false : true;
}

// TEMP: Only if node;
async function useGraphql() {
  const qa = (await cli.ask('Use graphql? [Y/n]:  ')).toLocaleLowerCase();
  // Node is default, only node and deno is possible. if input and not deno, always node.
  return (qa === 'n' || qa === 'no') ? false : true;
}

// TEMP: Only if node;
async function useMongo() {
  const qa = (await cli.ask('Use mongo? [Y/n]:  ')).toLocaleLowerCase();
  // Node is default, only node and deno is possible. if input and not deno, always node.
  return (qa === 'n' || qa === 'no') ? false : true;
}

async function askUser(): Promise<UserConfig> {
  const runtime = await getRuntime();
  const config:UserConfig = {
    isNode: (runtime === 'node'),
    isDeno: (runtime === 'deno'),
    runtime,
    node: {},
  }
  if (runtime === 'node') {
    const express = await useExpress();
    config.node!.express = express;
  }
  if (config.node!.express) {
    const mongo = await useMongo();
    config.node!.mongo = mongo;
  }
  if (config.node!.mongo) {
    const graphql = await useGraphql();
    config.node!.graphql = graphql;
  }
  return config;
}

const buildConfig = await askUser();
const tempFolderName = 'temp_template_project_bs';
const tempFolder = `${Deno.cwd()}/${tempFolderName}`;

async function getTemplates() {
  const cdRun = await sub.run(['git', 'clone', 'git@github.com:dennisolien/project-templates.git', tempFolderName]);
  const cdStr = await sub.denoSubProcessToString(cdRun);
  return true;
}

async function getFiles(config:UserConfig) {
  const { isNode } = config;
  const projectPath = Deno.cwd();
  if (isNode) {
    const { node } = config;
    const nodePath = `${tempFolder}/node`;
    await copy(`${nodePath}/base`, projectPath, { overwrite: true });
    if (node?.express) {
      const expressPath = `${nodePath}/express`;
      await copy(expressPath, projectPath, { overwrite: true });
    }
    if (node?.mongo) {
      const mongoPath = `${nodePath}/mongo`;
      await copy(mongoPath, projectPath, { overwrite: true });
    }
    if (node?.graphql) {
      const graphqlPath = `${nodePath}/graphql`;
      await copy(graphqlPath, projectPath, { overwrite: true });
    }
  }
}

await getTemplates();
await getFiles(buildConfig);

await emptyDir(tempFolder);
await Deno.remove(tempFolder);




  