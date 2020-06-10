/**
 * For now this is a bit naive code.
 * I make a lot of assumptions, about the project and files.
 * This will not work outside of a very specific setup.
 * 
 * It will for the time being only work with.
 * 1. DB: mongoDb with mongoose
 * 2. gql server: Express and Apollo
 * 
 * I would like to make it more dynamic, and versatile later.
 * 
 * The parsing of documents/templates, is very naive. just small changes will brake it all.
 * Something i will work on.
 * 
 * Using the cli, can overwrite changes, that was made outside of the cli.
 * I need to have a way to merge changes.
 */

import { copy, emptyDir, exists, writeFileStr, readFileStr, walk } from "https://deno.land/std@0.51.0/fs/mod.ts";
import { parse } from 'https://deno.land/std@0.51.0/flags/mod.ts';
import * as logger from 'https://deno.land/std/log/mod.ts';
import * as cli from '../helper/cli/mod.ts';
import * as sub from '../helper/sub_process/mod.ts';
import * as fs from '../helper/fs/mod.ts';
import generateMongoModel from './mongo-model.ts';

const pathToSelf = import.meta.url.replace('file://', '');
const projectPath = Deno.cwd();

async function getTemplates(tempFolderName:string) {
  const cdRun = await sub.run(['git', 'clone', 'git@github.com:dennisolien/project-templates.git', tempFolderName]);
  const cdStr = await sub.denoSubProcessToString(cdRun);
  return true;
}

function copyFromTemplate(copyFromPath:string, pasteToPath:string) {
  return copy(copyFromPath, pasteToPath, { overwrite: true });
}

async function initProject(tempFolder:string) {
  const nodePath = `${tempFolder}/node`;
  const baseNodePath = `${nodePath}/base`;
  const expressPath = `${nodePath}/express`;
  const mongoPath = `${nodePath}/mongo`;
  const graphqlPath = `${nodePath}/graphql`;

  await copyFromTemplate(baseNodePath, projectPath);
  await copyFromTemplate(expressPath, projectPath);
  await copyFromTemplate(mongoPath, projectPath);
  await copyFromTemplate(graphqlPath, projectPath);
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
  const dirPath = `${projectPath}/${dir}`;
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

function getModelDefinition(modelData:string) {
  // TODO: find a good way to parse this, this is very naive.
  const removeTop = modelData.split('\n').slice(3);
  const removeBottom = removeTop.slice(0, removeTop.length - 6);
  return removeBottom.reduce((result:any, line:string) => {
    let item = line.trim();
    const noActionOnItems = ['{', '},', '}'];
    if (noActionOnItems.includes(item)) {
      return result;
    }
    if (item.includes(': {')) {
      const [key] = item.split(':');
      result.push({
        key,
        props: {},
      });
      return result;
    }
    // TODO: Need to check for other, blocks: [
    if (item.includes(': ')) {
      const [key, val] = item.split(': ');
      const valHaveComma = val.substr(val.length - 1) === ',';
      // Remove the comma from the string;
      let value = valHaveComma ? val.substr(0, val.length - 1) : val;
      // Iff string is in quotes, remove them.
      value = (value.substr(0, 1) === '\'' || value.substr(0, 1) === '"') ? value.substr(1) : value;
      value = (value.substr(value.length - 1) === '\'' || value.substr(value.length - 1) === '"') ? value.substr(0, value.length - 1) : value;

      Object.assign(result[result.length - 1].props, {
        [key]: value,
      });
      return result;
    }
    return result;
  }, []);
}

function getSchemaDefinition(schemaData:string) {
  // TODO: find a good way to parse this, this is very naive.
  const removeTop = schemaData.split('\n').slice(3);
  const removeBottom = removeTop.slice(0, removeTop.length - 2);
  const result:any = {
    types: [],
    extenuations: [],
    inputs: [],
    querys: [],
    mutations: [],
  }
  let currentBlockType = '';
  let currentBlock = '';
  removeBottom.forEach((line) => {
    // Assume it is a type declaration
    if (!line.includes('extend') && (line.includes('type') && line.includes('{'))) {
      currentBlockType = 'types';
      currentBlock = `${line}\n`;
    } else if (line.includes('input') && line.includes('{')) {
      currentBlockType = 'inputs';
      currentBlock = `${line}\n`;
    } else if (line.includes('extend') && line.includes('{')) {
      currentBlockType = 'extenuations';
      if (line.includes('Query')) {
        currentBlockType = 'querys';
      }
      if (line.includes('Mutation')) {
        currentBlockType = 'mutations';
      }
      currentBlock = `${line}\n`;
    } else {
      currentBlock = `${currentBlock}${line}\n`;
    }
    // Assume end of block
    if (line.trim() === '}' && currentBlockType) {
      result[currentBlockType].push(currentBlock);
      currentBlockType = '';
    }
  })
  return result;
}

async function getModelData(modelDirPath:string, fileName:string) {
  const modelPath = `${modelDirPath}/${fileName}`;
  const modelExists = await exists(modelPath);
  if (!modelExists) {
    return null;
  }
  const modelData = await readFileStr(modelPath, { encoding: 'utf8' });
  return getModelDefinition(modelData);
}

async function getSchemaData(schemaDirPath:string, fileName:string) {
  const schemaPath = `${schemaDirPath}/${fileName}`;
  const schemaExists = await exists(schemaPath);
  if (!schemaExists) {
    return null;
  }
  const schemaData = await readFileStr(schemaPath, { encoding: 'utf8' });
  return getSchemaDefinition(schemaData);
}

function createSchemaContentFromModelData(modelData:any, setRequired:boolean = true, idString?:string): string[] {
  const schemaContent = modelData.reduce((result: string[], property:any) => {
    const prop = property.key;
    const propType = property.props.type;
    const resultProp = `${prop}: ${propType}`;
    if (property.props.required && setRequired) {
      result.push(`${resultProp}!`);
      return result;
    }
    result.push(resultProp);
    return result;
  }, []);
  if (idString) {
    schemaContent.unshift(idString);
  }
  return schemaContent;
}

function getResolversFromSchemaData(schemaData:any) {
  // TODO: need to do this better, it is very naive.
  const schemaQuery = schemaData.querys;
  const schemaMutations = schemaData.mutations;
  const queryFuncs:any = [];
  const mutationFuncs:any = [];
  schemaQuery.forEach((item:string) => {
    item.split('\n').slice(1).forEach((q) => {
      const query = q.trim();
      if (query.includes('(')) {
        queryFuncs.push(query.split('(')[0]);
      }
    });
  });
  schemaMutations.forEach((item:string) => {
    item.split('\n').slice(1).forEach((m) => {
      const mutation = m.trim();
      if (mutation.includes('(')) {
        mutationFuncs.push(mutation.split('(')[0]);
      }
    });
  });
  const Query = queryFuncs.reduce((result:any, fnName:any) => {
    let query = `ctx.models.${fnName}.findOne({ _id: input.id })`
    // TODO: naive get one or many check.
    if (fnName.substr(fnName.length - 1) === 's') {
      const singleFnName = fnName.substr(0, fnName.length - 1);
      query = `ctx.models.${singleFnName}.find()`;
    }
    return Object.assign(result, {
      [fnName]: `async (parent, input, ctx) => ${query}`,
    })
  }, {});
  const Mutation = mutationFuncs.reduce((result:any, fnName:any) => {
    let mutation = '({})';
    if (fnName.includes('create')) {
      // TODO: one more naive assumption.
      const modelName = fnName.replace('create', '');
      mutation = `ctx.models.${modelName}.create(input)`;
    }
    return Object.assign(result, {
      [fnName]: `async (parent, input, ctx) => ${mutation}`,
    })
  }, {});
  return {
    Query,
    Mutation,
  };
}

async function updateSchemaResolverIndexRequire(dirPath:string, varName:string) {
  const importFiles = [];
  for await (const entry of walk(dirPath, { maxDepth: 1 })) {
    if (entry.name !== 'index.js' && entry.isFile) {
      importFiles.push(`require('./${entry.name}')`);
    }
  }
  // JSON.stringify(importFiles, null, 2)
  const content = `const ${varName} = [
${importFiles.join(',\n')}
];
  
module.exports = ${varName};
`;
  return writeFileStr(`${dirPath}/index.js`, content);
}

async function updateModelIndexRequire(dirPath:string) {
  const importFiles = {};
  for await (const entry of walk(dirPath, { maxDepth: 1 })) {
    if (entry.name !== 'index.js' && entry.isFile) {
      const modelName = entry.name.substr(0, entry.name.length - 3);
      const modelNameFirstCharUp = `${modelName.substr(0, 1).toUpperCase()}${modelName.substr(1)}`;
      Object.assign(importFiles, {
        [modelNameFirstCharUp]: `require('./${entry.name}')`,
      });
    }
  }
  // JSON.stringify(importFiles, null, 2)
  const content = `module.exports = ${JSON.stringify(importFiles, null, 2)};

  `;
  return writeFileStr(`${dirPath}/index.js`, content.replace(/"/gi, ''));
}

async function removeExamples(dirPath:string) {
  for await (const entry of walk(dirPath, { maxDepth: 1 })) {
    if (entry.isFile && (entry.name.includes('.example.js') || entry.name.includes('.example.ts'))) {
      return Deno.remove(entry.path);
    }
  }
}

async function removeAllExamples() {
  const modelPath = `${projectPath}/model`;
  const schemaPath = `${projectPath}/schema`;
  const resolverPath = `${projectPath}/resolver`;
  await removeExamples(modelPath);
  await removeExamples(schemaPath);
  await removeExamples(resolverPath);
  if (flags.i || flags.index) {
    await updateSchemaResolverIndexRequire(schemaPath, 'typeDefs');
    await updateSchemaResolverIndexRequire(resolverPath, 'resolvers');
    await updateModelIndexRequire(`${projectPath}/model`);
  }
  return true;
}


const commands:any = {
  create: {
    exec: async (flags:any) => {
      // TODO: Check if current dir is empty.
      logger.info('creating new project');
      const tempFolderName = 'temp_template_project_bs';
      const tempFolder = `${projectPath}/${tempFolderName}`;
      // Boilerplate
      await getTemplates(tempFolderName);
      await initProject(tempFolder);
      // Remove tempFiles:
      // TODO: store files ~/user.
      await emptyDir(tempFolder);
      await Deno.remove(tempFolder);
      if (!flags.e || !flags.examples) {
        await removeAllExamples();
      }
      return true;
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
        logger.info(`Creating new model: ${filePath}/${name}.js`);
        await writeFileStr(filePath, generateMongoModel(nameFirstUpper));
        if (flags.i || flags.index) {
          await updateModelIndexRequire(`${projectPath}/model`);
        }
        return true;
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

        const modelNameRaw = flags.m || flags.model || name;
        const modelName = modelNameRaw.substr(modelNameRaw.length - 3) === '.js' ? modelNameRaw : `${modelNameRaw}.js`; // TODO: Support for ts.
        
        if (!dirExists) {
          return logger.error('Dir "schema" is not in the current dir, add path to schemas with: -p|--path [path to schema dir]');
        }
        if (fileExists) {
          return logger.error(`Schema: ${filePath}, already exists`);
        }
        logger.info(`Creating new schema: ${filePath}/${name}.js`);

        const modelData = await getModelData(`${projectPath}/model`, modelName);
        
        const schemaTemplate = await readFileStr(`${pathToSelf}/../schema-template.txt`, { encoding: 'utf8' });
        // TODO: find a good way to tab.
        let newSchema = schemaTemplate.replace(/\${name}/gi, nameFirstUpper);
        
        if (modelData) {
          const schemaContentWithRequeued = createSchemaContentFromModelData(modelData, true, 'id: ID!').join('\n');
          const schemaContentWithRequeuedNoId = createSchemaContentFromModelData(modelData, true).join('\n');
          const schemaContentWithOutRequeued = createSchemaContentFromModelData(modelData, false).join('\n');
          newSchema = newSchema.replace(/\${contentMain}/gi, schemaContentWithRequeued)
            .replace(/\${contentNoRequired}/gi, schemaContentWithOutRequeued)
            .replace(/\${contentMainNoId}/gi, schemaContentWithRequeuedNoId);
        }

        await writeFileStr(filePath, newSchema);
        if (flags.i || flags.index) {
          await updateSchemaResolverIndexRequire(`${projectPath}/schema`, 'typeDefs');
        }
        return true;
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

        const schemaNameRaw = flags.s || flags.schema || name;
        const schemaName = schemaNameRaw.substr(schemaNameRaw.length - 3) === '.js' ? schemaNameRaw : `${schemaNameRaw}.js`; // TODO: Support for ts.
        
        if (!dirExists) {
          return logger.error('Dir "resolver" is not in the current dir, add path to resolver with: -p|--path [path to resolver dir]');
        }
        if (fileExists) {
          return logger.error(`Resolver: ${filePath}, already exists`);
        }
        const schemaData = await getSchemaData(`${projectPath}/schema`, schemaName);
        let resolvers = `module.exports = {
        Query: {},
        Mutation: {},
        `;
        if (schemaData) {
          const getResolvers = getResolversFromSchemaData(schemaData);
          resolvers = `module.exports = ${JSON.stringify(getResolvers, null, 2)}`;
        }
        logger.info(`Creating new resolver: ${filePath}/${name}.js`);
        // TODO: use schema to create empty functions in resolver object.
        resolvers = resolvers.replace(/"/gi, '');
        await writeFileStr(filePath, resolvers);
        if (flags.i || flags.index) {
          await updateSchemaResolverIndexRequire(`${projectPath}/resolver`, 'resolvers');
        }
        return true;
      },
    },
  },
  index: {
    exec: async (flags:any) => {
      // TEMP: testing how to create files.
      await updateSchemaResolverIndexRequire(`${projectPath}/schema`, 'typeDefs');
      await updateSchemaResolverIndexRequire(`${projectPath}/resolver`, 'resolvers');
      await updateModelIndexRequire(`${projectPath}/model`);
      return true;
    },
  },
  remove: {
    example: {
      exec: async (flags:any) => {
        return removeAllExamples();
      },
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
