import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';
import * as sub from './mod.ts';

Deno.test({
  name: 'denoSubProcessToString',
  async fn(): Promise<void> {
    const denoRun = sub.run(['echo', 'hello']);
    const result = await sub.denoSubProcessToString(denoRun);
    assertEquals(result.trim(), 'hello');
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
