
export function run(commands: string[]) {
  return Deno.run({
    cmd: [...commands],
    stdout: "piped",
    stderr: "piped",
  });
}

export async function denoSubProcessToString(denoRun: any): Promise<string> {
  const { code } = await denoRun.status();
  if (code === 0) {
    const output = await denoRun.output();
    const outputString = new TextDecoder().decode(output);
    return outputString;
  }
  const errOutput = await denoRun.stderrOutput();
  const errorOutputString = new TextDecoder().decode(errOutput);
  throw new Error(errorOutputString);
}