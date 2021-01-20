import { readFileStr, walk } from 'https://deno.land/std@0.51.0/fs/mod.ts';
import * as parser from '../parser/parser.ts';

/**
 * Can use a lot of work
 * Really slow, but its fine for now.
 */

function getMongoDeclaration(astBody:any) {
  return astBody.filter((item:any) => {
    if (!item.declarations) {
      return false
    }
    const declaration = item.declarations[0];
    if (!declaration || !declaration.init || !declaration.init.callee) {
      return false;
    }
    const isNewExpression = (declaration.init.type === 'NewExpression')
    const callee = declaration.init.callee;
    const isMongo = (callee.type === 'MemberExpression' && callee.property.name === 'Schema');
    return isNewExpression && isMongo;
  });
}

function getModelName(astBody:any, schemaVarName:any):any {
  let varName;
  const data = astBody.find((item:any) => {
    if (!item.declarations) {
      return false
    }
    const declaration = item.declarations[0];
    if (!declaration || !declaration.init || !declaration.init.callee) {
      return false;
    }
    const isNewExpression = (declaration.init.type === 'CallExpression')
    const callee = declaration.init.callee;
    const isMongo = (callee.type === 'MemberExpression' && callee.property.name === 'model');
    // varName = !varName && isMongo && item.type === 'VariableDeclarator' && item.id
    const modelName = declaration.init.arguments[0].value;
    const schemaName = declaration.init.arguments[1].name;
    if (isMongo && schemaName === schemaVarName) {
      return true
    }
    return false;
  });
  return data ? data.declarations[0].init.arguments[0].value : null;
}

function getModelObject(mongoModelDeclaration:any, astBody:any) {
  return mongoModelDeclaration.reduce((result:any, item:any) => {
    const model = item.declarations[0].init.arguments[0]; // Model is first arg of `new mongoose.Schema`
    const varName = item.declarations[0].type === 'VariableDeclarator' && item.declarations[0].id ? item.declarations[0].id.name : null;
    const modelName = getModelName(astBody, varName);
    const modelObject = model.properties.reduce((result:any, def:any) => {
      const key = def.key.name;
      const v = parser.resolveValue(def);
      return Object.assign(result, v);
    }, {});
    return Object.assign(result, {
      [modelName]: modelObject,
    });
  }, {});
}

export async function getSchemaFromFile(filePath:string) {
  const astBody = await parser.getASTBody(filePath);
  const declaration = getMongoDeclaration(astBody);
  return getModelObject(declaration, astBody);
}

export async function getSchemasFromDir(dirPath:string) {
  const declarations = {};
  for await (const entry of walk(dirPath, { maxDepth: 1 })) {
    if (entry.isFile) {
      const astBody = await parser.getASTBody(entry.path);
      const declaration = getMongoDeclaration(astBody);
      Object.assign(declarations, getModelObject(declaration, astBody));
    }
  }
  return declarations;
}
