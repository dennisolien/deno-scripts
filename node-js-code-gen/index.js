const { default: generator } = require('@babel/generator');

const ast64 = process.argv[2];

if (ast64) {
  const buff = new Buffer.from(ast64, 'base64');
  const ast = buff.toString('utf8');
  const { code } = generator(JSON.parse(ast));
  const codeBuff = new Buffer.from(code);
  const codeBase64 = codeBuff.toString('base64');
  console.log(code)
} else {
  throw new Error('no ast');
}
