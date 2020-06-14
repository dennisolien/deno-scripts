import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';
import { getASTFromString } from '../parsers/babylon-helper.ts';
import { codeFromAST } from '../generators/ast-to-code.ts';

Deno.test({
  name: 'code to ast to code',
  async fn(): Promise<void> {
    const code = `const hei = 'hello';`;
    const ast = getASTFromString(code);
    const codeFromAst = await codeFromAST(ast);
    assertEquals(code.trim(), codeFromAst.trim());
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
