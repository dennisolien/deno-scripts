import { copy, emptyDir, exists, writeFileStr, readFileStr } from "https://deno.land/std@0.51.0/fs/mod.ts";
import { parse } from 'https://deno.land/std@0.51.0/flags/mod.ts';
import * as logger from 'https://deno.land/std/log/mod.ts';
import * as cli from '../helper/cli/mod.ts';
import * as sub from '../helper/sub_process/mod.ts';
import * as fs from '../helper/fs/mod.ts';
import generateMongoModel from './mongo-model.ts';

async function getTemplates(tempFolderName:string) {
  const cdRun = await sub.run(['git', 'clone', 'git@github.com:dennisolien/project-templates.git', tempFolderName]);
  const cdStr = await sub.denoSubProcessToString(cdRun);
  return true;
}

async function initProject(tempFolder:string) {
  const projectPath = Deno.cwd();
  const nodePath = `${tempFolder}/node`;

  await copy(`${nodePath}/base`, projectPath, { overwrite: true });
  const expressPath = `${nodePath}/express`;
  await copy(expressPath, projectPath, { overwrite: true });
  const mongoPath = `${nodePath}/mongo`;
  await copy(mongoPath, projectPath, { overwrite: true });
  const graphqlPath = `${nodePath}/graphql`;
  await copy(graphqlPath, projectPath, { overwrite: true });
}

function parseName(name:string) {
  const nameRaw = name;
  const nameLowerCase = nameRaw.toLowerCase().trim(); // Need to check if chars are allowed.
  const nameFirstUpper = `${nameLowerCase.substr(0, 1).toUpperCase()}${nameLowerCase.substr(1)}`;
  return {
    name: nameLowerCase,
    nameRaw,
    nameFirstUpper,
  };
}

async function parsePaths(name:string, dir:string) {
  const dirPath = `${Deno.cwd()}/${dir}`;
  const filePath = `${dirPath}/${name}.js`;
  const dirExists = await exists(dirPath);
  const fileExists = await exists(filePath);
  return {
    dirPath,
    filePath,
    dirExists,
    fileExists,
  };
}


const commands:any = {
  create: {
    exec: async (flags:any) => {
      // TODO: Check if current dir is empty.
      logger.info('creating new project');
      const tempFolderName = 'temp_template_project_bs';
      const tempFolder = `${Deno.cwd()}/${tempFolderName}`;
      // Boilerplate
      await getTemplates(tempFolderName);
      await initProject(tempFolder);
      // Remove tempFiles:
      // TODO: store files ~/user.
      await emptyDir(tempFolder);
      await Deno.remove(tempFolder);
    },
    model: {
      exec: async (flags:any) => {
        if (!flags.name && !flags.n) {
          return logger.error('Model name (-n|--name) is required');
        }
        const { name, nameFirstUpper } = parseName(flags.name || flags.n);
        const {
          dirPath,
          filePath,
          dirExists,
          fileExists,
        } = await parsePaths(name, 'model');
        // TODO: parse name, file name can have - and . ++, but the model can not.
        
        if (!dirExists) {
          return logger.error('Dir "model" is not in the current dir, add path to models with: -p|--path [path to model dir]');
        }
        if (fileExists) {
          return logger.error(`Model: ${filePath}, already exists`);
        }
        logger.info(`Creating new model: ${name}.js`);
        return writeFileStr(filePath, generateMongoModel(nameFirstUpper));
      },
    },
    schema: {
      exec: async (flags:any) => {
        if (!flags.name && !flags.n) {
          return logger.error('Schema name (-n|--name) is required');
        }
        const { name, nameFirstUpper } = parseName(flags.name || flags.n);
        const {
          dirPath,
          filePath,
          dirExists,
          fileExists,
        } = await parsePaths(name, 'schema');
        
        if (!dirExists) {
          return logger.error('Dir "schema" is not in the current dir, add path to schemas with: -p|--path [path to schema dir]');
        }
        if (fileExists) {
          return logger.error(`Schema: ${filePath}, already exists`);
        }
        logger.info(`Creating new schema: ${name}.js`);
        // TODO: use model to create boilerplate, name and types.
        // TODO: Get one, get all with filter, create, update, delete by def.
        return writeFileStr(filePath, generateMongoModel(nameFirstUpper));
      },
    },
    resolver: {
      exec: async (flags:any) => {
        // TODO: with tests;
        if (!flags.name && !flags.n) {
          return logger.error('Resolver name (-n|--name) is required');
        }
        const { name, nameFirstUpper } = parseName(flags.name || flags.n);
        const {
          dirPath,
          filePath,
          dirExists,
          fileExists,
        } = await parsePaths(name, 'resolver');
        
        if (!dirExists) {
          return logger.error('Dir "resolver" is not in the current dir, add path to resolver with: -p|--path [path to resolver dir]');
        }
        if (fileExists) {
          return logger.error(`Resolver: ${filePath}, already exists`);
        }
        logger.info(`Creating new resolver: ${name}.js`);
        // TODO: use schema to create empty functions in resolver object.
        return writeFileStr(filePath, generateMongoModel(nameFirstUpper));
      },
    },
  },
  temp: {
    exec: async () => {
      // TEMP: testing how to create files.
      const pathToSelf = import.meta.url.replace('file://', '');
      const readTemp = await readFileStr(`${pathToSelf}/../schema-template.txt`, { encoding: 'utf8' });
      const up = readTemp.replace(/\${name}/gi, 'Test');
      return writeFileStr(`${pathToSelf}/../ola.js`, up);
    },
  },
};

// TODO: define flags
function runner(params:string[], flags:any) {
  const func = params.reduce((result, name) => {
   if (!result[name]) {
     // TODO: return help
     logger.error(`${name} is not a command`);
     throw new Error('Not a command');
   } 
   return result[name];
  }, commands);

  if (typeof func.exec !== 'function') {
    // TODO: return help
    return logger.info('Missing props');
  }
  return func.exec(flags);
}

// [START];
const parsedArgs = cli.getParsedArgs();
const params = cli.getParams(parsedArgs);
const flags = cli.getFlags(parsedArgs);

await runner(params, flags);
