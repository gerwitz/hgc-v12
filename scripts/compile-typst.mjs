import { readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";

export const compileTypst = async (directory = "_site/editions/typst") =>
{
  const workspace = path.resolve(directory);
  const entries = await readdir(workspace, { recursive: true, withFileTypes: true });
  const sources = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".typ"))
    .map((entry) => path.join(entry.parentPath, entry.name)).sort();
  const compiler = NodeCompiler.create({ workspace });
  const outputs = [];

  for (const source of sources)
  {
    const output = source.replace(/\.typ$/, ".pdf");
    // Do not leave a stale PDF when its updated source fails to compile.
    await rm(output, { force: true });
    const compiled = compiler.compile({ mainFilePath: source });
    compiled.printDiagnostics();
    const document = compiled.result;

    if (!document)
    {
      throw new Error(`Cannot compile ${source}: Typst reported errors.`);
    }

    await writeFile(output, compiler.pdf(document));
    outputs.push(output);
  }

  return outputs;
};

if (process.argv[1] === fileURLToPath(import.meta.url))
{
  compileTypst().then((outputs) =>
  {
    console.log(`Compiled ${outputs.length} Typst document${outputs.length === 1 ? "" : "s"} to PDF.`);
  }).catch((error) =>
  {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
