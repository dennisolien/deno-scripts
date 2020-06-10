import { copy, emptyDir, exists, writeFileStr, readFileStr, walk } from "https://deno.land/std@0.51.0/fs/mod.ts";

function fileToString(filePath:string) {
  return readFileStr(filePath, { encoding: 'utf8' });
}

function splitOnBlocks(file:string, allBlocks:string[] = []):any {
  const blocks = [...allBlocks];
  const indexOfFirstOpenPar = file.indexOf('(');
  if (indexOfFirstOpenPar === -1) {
    return blocks
  }
  const indexOfFirstClosePar = (file.indexOf(')') + 1);
  const block = file.substring(indexOfFirstOpenPar, indexOfFirstClosePar);
  blocks.push(block);
  const rest = file.substring(indexOfFirstClosePar);
  if (rest && rest.length > 0) {
    return splitOnBlocks(rest, blocks)
  }
  return blocks
}

// function getFirstObject(file:string):any {
//   const indexOfFirstOpenPar = file.indexOf('{');
//   if (indexOfFirstOpenPar === -1) {
//     return null
//   }
//   const openBlock = file.substring(indexOfFirstOpenPar);
//   const nextOpenBlock = file.indexOf('{');
//   const indexOfFirstClosePar = (file.indexOf('}') + 1);
//   if (nextOpenBlock < indexOfFirstClosePar) {

//   }
//   return block
// }

function getMongooseModelDefinition(modelString:string) {
  // splits up the string, searching should go faster;
  // Expect the `new mongoose.Schema` to happen early in the file.
  const lines = modelString.trim().split('\n');
  let inDefinition = false;
  let paraOpened = 0;
  let paraClosed = 0;
  const defLines = [];

  let i = 0;
  while ((paraClosed === 0 || (paraClosed <= paraOpened)) && i <= lines.length) {
    const line = lines[i].trim();
    if (inDefinition) {
      paraOpened = line.includes('(') ? paraOpened += 1 : paraOpened;
      paraClosed = line.includes(')') ? paraClosed += 1 : paraClosed;
      if (paraClosed === 0 || (paraClosed <= paraOpened)) {
        defLines.push(line);
      }
    }
    if (line.includes('new mongoose.Schema(')) {
      inDefinition = true;
      const getDefOnLine = line.split('new mongoose.Schema(')[1];
      if (getDefOnLine.length > 0) {
        // the def might be on this line, parse it.
      }
    }
    i += 1;
  }
  return defLines.filter((line) => !!line);
}

function mongooseModelDefinitionToArray(definition:string[]) {
  return definition.reduce((result:any, line:string) => {
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
