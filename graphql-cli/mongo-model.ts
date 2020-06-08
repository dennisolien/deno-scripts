
/**
 * The tabs are like this so that the end file have the right numb of tabs.
 */

const exampleData:any = `exampleTitle: {
      type: String,
      required: '{PATH} is required!',
    },`;

export default function getModelFileContent(name:string, data:any = exampleData) {
  return `const mongoose = require('mongoose');

const mongoSchema = new mongoose.Schema(
  {
    ${data}
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('${name}', mongoSchema);`;
}