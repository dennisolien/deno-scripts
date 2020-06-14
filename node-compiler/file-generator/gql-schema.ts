const keymap:any = {
  'mongoose.Schema.Types.ObjectId': 'ID',
  'mongoose.Schema.Types.Mixed': 'Any',
  'Number': 'Int',
  'String': 'String',
  'Date': 'DateTime',
  'Boolean': 'Boolean',
}

function crateGqlSchemaFromMongooseSchema(mongoose:any) {
  const entries = Object.entries(mongoose);
  return entries.reduce((result:any, item:any) => {
    const name:string = item[0];
    const object:any = item[1];
    const e = Object.entries(object);
    if (!result.hasOwnProperty(name)) {
      result[name] = [];
    }
    e.forEach((line:any) => {
      const props:any = line[1];
      const lineType:string = props ? props.type : '';
      const key:string = line[0];
      if (lineType) {
        const type = keymap[lineType];
        if (!type) {
          throw new Error(`No gql type in keymap for mongo type: ${lineType}`);
        }
        result[name].push(`${line[0]}: ${type}`);
      }
    });
    return result;
  }, {});
}

// TODO: create query, mutations

// TODO: Create schema file
// TODO: update schema file