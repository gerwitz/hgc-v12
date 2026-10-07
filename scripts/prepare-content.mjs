import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, mkdtemp, open, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { CATALOG_PATH, buildContentCatalog, prepareCatalogSources, readContentCatalog } from "./content-catalog.mjs";

const execute = promisify(execFile);
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUTPUTS = [CATALOG_PATH, "generated/related-content-cache.json", "generated/related-graph-cache.json", "src/_data/related.json"];
const MAP_PREFIX = "src/_generated/maps/";
const DEFAULT_MODEL = "text-embedding-3-small";


const isOutput = (filePath) => OUTPUTS.includes(filePath) || filePath.startsWith(MAP_PREFIX);
const isInput = (filePath) => !isOutput(filePath)
  && (filePath.startsWith("src/") || filePath.startsWith("eleventy/") || filePath.startsWith("scripts/")
    || [".eleventy.js", "package.json", "package-lock.json"].includes(filePath));

const git = async (repositoryPath, arguments_, { indexFile, input, encoding = "utf8" } = {}) =>
{
  const environment = { ...process.env, GIT_EDITOR: "true", GIT_TERMINAL_PROMPT: "0" };
  if (indexFile === null)
  {
    delete environment.GIT_INDEX_FILE;
  }
  else if (indexFile)
  {
    environment.GIT_INDEX_FILE = indexFile;
  }
  if (input === undefined)
  {
    const { stdout } = await execute("git", ["--no-pager", "--no-optional-locks", "--literal-pathspecs", ...arguments_], {
      cwd: repositoryPath, env: environment, encoding, maxBuffer: 32 * 1024 * 1024, timeout: 120000,
    });
    return stdout;
  }

  return new Promise((resolve, reject) =>
  {
    const child = spawn("git", ["--no-pager", "--no-optional-locks", "--literal-pathspecs", ...arguments_], {
      cwd: repositoryPath, env: environment, stdio: ["pipe", "pipe", "pipe"],
    });
    const output = [];
    const errors = [];
    const timer = setTimeout(() => child.kill("SIGTERM"), 120000);
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => errors.push(chunk));
    child.once("error", reject);
    child.once("close", (code) =>
    {
      clearTimeout(timer);
      if (code === 0)
      {
        resolve(Buffer.concat(output).toString("utf8"));
      }
      else
      {
        reject(new Error(`Git ${arguments_[0]} failed: ${Buffer.concat(errors).toString("utf8")}`));
      }
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
};

const indexEntries = (output) => output.split("\0").filter(Boolean).map((line) =>
{
  const separator = line.indexOf("\t");
  const [mode, hash, stage] = line.slice(0, separator).split(" ");
  if (stage !== "0")
  {
    throw new Error("Resolve merge conflicts before preparing content.");
  }
  return { path: line.slice(separator + 1), mode, hash };
});

const treeEntries = (output) => output.split("\0").filter(Boolean).map((line) =>
{
  const separator = line.indexOf("\t");
  const [mode, , hash] = line.slice(0, separator).split(" ");
  return { path: line.slice(separator + 1), mode, hash };
});

const inputHash = (entries, model) => createHash("sha256")
  .update(JSON.stringify({ model, files: entries.filter((entry) => isInput(entry.path)).sort((first, second) => first.path < second.path ? -1 : first.path > second.path ? 1 : 0) }))
  .digest("hex");

const readCommittedCatalog = async (repositoryPath, temporaryPath, reference = "HEAD") =>
{
  let contents;
  try
  {
    contents = await git(repositoryPath, ["show", `${reference}:${CATALOG_PATH}`]);
  }
  catch
  {
    return null;
  }
  await writeFile(temporaryPath, contents);
  return readContentCatalog(temporaryPath);
};

const stagedRenames = async (repositoryPath) =>
{
  const fields = (await git(repositoryPath, ["diff", "--cached", "--name-status", "-z", "--find-renames"])).split("\0");
  const renames = {};
  for (let index = 0; index < fields.length && fields[index]; index += 1)
  {
    const status = fields[index];
    const oldPath = fields[++index];
    if (status.startsWith("R") || status.startsWith("C"))
    {
      const newPath = fields[++index];
      if (status.startsWith("R"))
      {
        renames[newPath] = oldPath;
      }
    }
  }
  return renames;
};

const walkFiles = async (directory, prefix = "") =>
{
  let children;
  try
  {
    children = await readdir(directory, { withFileTypes: true });
  }
  catch (error)
  {
    if (error.code === "ENOENT")
    {
      return [];
    }
    throw error;
  }
  const files = [];
  for (const child of children)
  {
    const relativePath = prefix + child.name;
    if (child.isDirectory())
    {
      files.push(...await walkFiles(path.join(directory, child.name), `${relativePath}/`));
    }
    else if (child.isFile())
    {
      files.push(relativePath);
    }
    else
    {
      throw new Error(`Generated artifacts must be regular files: ${relativePath}`);
    }
  }
  return files;
};

const runWorker = async ({ snapshotPath, model }) =>
{
  const workerPath = path.join(snapshotPath, "scripts/related-content.js");
  try
  {
    await lstat(workerPath);
  }
  catch
  {
    throw new Error("Stage the content preparation scripts before running content:prepare.");
  }
  await new Promise((resolve, reject) =>
  {
    const child = spawn(process.execPath, [workerPath, "--worker"], { cwd: snapshotPath, env: { ...process.env, OPENAI_EMBEDDING_MODEL: model }, stdio: "inherit" });
    const timer = setTimeout(() => child.kill("SIGTERM"), 10 * 60 * 1000);
    child.once("error", reject);
    child.once("close", (code) =>
    {
      clearTimeout(timer);
      if (code === 0)
      {
        resolve();
      }
      else
      {
        reject(new Error("Content preparation failed; no generated artifacts were published or staged."));
      }
    });
  });
};

const matchesFile = async (filePath, expected) =>
{
  try
  {
    if (!(await lstat(filePath)).isFile() || expected === undefined)
    {
      return false;
    }
    return (await readFile(filePath)).equals(expected);
  }
  catch (error)
  {
    if (error.code === "ENOENT")
    {
      return expected === undefined;
    }
    throw error;
  }
};

const lockIndex = async (indexPath) =>
{
  const lockPath = `${indexPath}.lock`;
  const handle = await open(lockPath, "wx");
  await handle.close();
  return lockPath;
};

export const prepareContent = async ({
  repositoryPath = ROOT,
  now = new Date().toISOString(),
  model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_MODEL,
  processSnapshot = runWorker,
  logger = console,
} = {}) =>
{
  const cachePath = path.join(repositoryPath, ".cache");
  await mkdir(cachePath, { recursive: true });
  const workspace = await mkdtemp(path.join(cachePath, "content-prepare-"));
  const snapshotPath = path.join(workspace, "snapshot");

  try
  {
    const activeIndex = (await git(repositoryPath, ["rev-parse", "--path-format=absolute", "--git-path", "index"])).trim();
    const normalIndex = (await git(repositoryPath, ["rev-parse", "--path-format=absolute", "--git-path", "index"], { indexFile: null })).trim();
    if (activeIndex !== normalIndex)
    {
      throw new Error("Content preparation does not support --only or pathspec commits. Stage the desired changes (git add -p is supported), then use ordinary staged git commit.");
    }
    const originalIndex = await readFile(activeIndex);
    const entries = indexEntries(await git(repositoryPath, ["ls-files", "--stage", "-z"]));
    const fingerprint = inputHash(entries, model);
    const committedCatalog = await readCommittedCatalog(repositoryPath, path.join(workspace, "committed.json"));
    const sources = await prepareCatalogSources({
      repositoryPath,
      sourcePaths: entries.map((entry) => entry.path),
      renames: await stagedRenames(repositoryPath),
      committedCatalog,
      now,
    });

    await mkdir(snapshotPath);
    await git(repositoryPath, ["checkout-index", "--all", `--prefix=${snapshotPath}${path.sep}`]);
    await mkdir(path.join(snapshotPath, "generated"), { recursive: true });
    await writeFile(path.join(snapshotPath, CATALOG_PATH), `${JSON.stringify(buildContentCatalog({ sources, inputHash: fingerprint, embeddingModel: model }), null, 2)}\n`);
    await symlink(path.join(repositoryPath, "node_modules"), path.join(snapshotPath, "node_modules"), "dir");
    await processSnapshot({ snapshotPath, sources, inputHash: fingerprint, model });
    const preparedCatalog = await readContentCatalog(path.join(snapshotPath, CATALOG_PATH));
    if (preparedCatalog.inputHash !== fingerprint || preparedCatalog.embeddingModel !== model
      || JSON.stringify(preparedCatalog.sources) !== JSON.stringify(sources))
    {
      throw new Error("Prepared catalog does not match the staged input snapshot.");
    }

    const artifacts = [...OUTPUTS, ...(await walkFiles(path.join(snapshotPath, MAP_PREFIX))).map((filePath) => MAP_PREFIX + filePath)];
    const changed = [];

    for (const filePath of artifacts)
    {
      const sourcePath = path.join(snapshotPath, filePath);
      if (!(await lstat(sourcePath)).isFile())
      {
        throw new Error(`Generated artifacts must be regular files: ${filePath}`);
      }
      const contents = await readFile(sourcePath);
      const hash = (await git(repositoryPath, ["hash-object", "-w", "--stdin"], { input: contents })).trim();
      const indexed = entries.find((entry) => entry.path === filePath);

      if (indexed?.hash === hash)
      {
        continue;
      }
      let previous;
      try
      {
        const destination = path.join(repositoryPath, filePath);
        if (!(await lstat(destination)).isFile())
        {
          throw new Error(`Generated artifacts must be regular files: ${filePath}`);
        }
        previous = await readFile(destination);
      }
      catch (error)
      {
        if (error.code !== "ENOENT")
        {
          throw error;
        }
      }
      const worktreeHash = previous === undefined ? undefined
        : (await git(repositoryPath, ["hash-object", "--stdin"], { input: previous })).trim();
      if (indexed ? worktreeHash !== indexed.hash : previous !== undefined)
      {
        throw new Error(`Unstaged or untracked generated changes would be overwritten: ${filePath}. Stage or restore them first.`);
      }
      changed.push({ path: filePath, hash, contents, previous });
    }

    // Prepare a replacement index without exposing partial staging if any earlier step fails.
    const nextIndex = path.join(workspace, "index");
    await copyFile(activeIndex, nextIndex);
    const indexInfo = changed.map((artifact) => `100644 ${artifact.hash}\t${artifact.path}\0`).join("");
    await git(repositoryPath, ["update-index", "-z", "--index-info"], { indexFile: nextIndex, input: indexInfo });
    if (!(await readFile(activeIndex)).equals(originalIndex))
    {
      throw new Error("The Git index changed during preparation; retry with a stable staged snapshot.");
    }

    const preparedIndex = await readFile(nextIndex);
    const published = [];
    const lockPath = await lockIndex(activeIndex);
    let indexPublished = false;
    try
    {
      if (!(await readFile(activeIndex)).equals(originalIndex))
      {
        throw new Error("The Git index changed during preparation; retry with a stable staged snapshot.");
      }
      for (const artifact of changed)
      {
        const destination = path.join(repositoryPath, artifact.path);
        const temporaryArtifact = path.join(workspace, "artifact");
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(temporaryArtifact, artifact.contents);
        if (!await matchesFile(destination, artifact.previous))
        {
          throw new Error(`Generated artifact changed during preparation: ${artifact.path}`);
        }
        await rename(temporaryArtifact, destination);
        published.push(artifact);
      }
      if (!(await readFile(activeIndex)).equals(originalIndex))
      {
        throw new Error("The Git index changed during preparation; retry with a stable staged snapshot.");
      }
      await rename(nextIndex, activeIndex);
      indexPublished = true;

    }
    catch (error)
    {
      const rollbackErrors = [];
      try
      {
        if (indexPublished && (await readFile(activeIndex)).equals(preparedIndex))
        {
          await writeFile(nextIndex, originalIndex);
          await rename(nextIndex, activeIndex);
        }
      }
      catch (rollbackError)
      {
        rollbackErrors.push(rollbackError);
      }
      for (const artifact of published.reverse())
      {
        try
        {
          const destination = path.join(repositoryPath, artifact.path);
          // A user's edit after publication belongs to them, even when we must roll back.
          if (!await matchesFile(destination, artifact.contents))
          {
            continue;
          }
          if (artifact.previous === undefined)
          {
            await rm(destination, { force: true });
          }
          else
          {
            const temporaryArtifact = path.join(workspace, "rollback-artifact");
            await writeFile(temporaryArtifact, artifact.previous);
            await rename(temporaryArtifact, destination);
          }
        }
        catch (rollbackError)
        {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length)
      {
        throw new AggregateError([error, ...rollbackErrors], "Content preparation failed and rollback was incomplete.");
      }
      throw error;
    }
    finally
    {
      await rm(lockPath, { force: true });
    }
    logger.log(`Prepared and staged ${changed.length} generated artifacts.`);
    return { changed: changed.map((artifact) => artifact.path) };
  }
  finally
  {
    await rm(workspace, { recursive: true, force: true });
  }
};

export const checkPreparedContent = async ({ repositoryPath = ROOT, model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_MODEL } = {}) =>
{
  const cachePath = path.join(repositoryPath, ".cache");
  await mkdir(cachePath, { recursive: true });
  const workspace = await mkdtemp(path.join(cachePath, "content-check-"));
  try
  {
    const catalog = await readCommittedCatalog(repositoryPath, path.join(workspace, "catalog.json"));
    const entries = treeEntries(await git(repositoryPath, ["ls-tree", "-r", "-z", "HEAD"]));
    if (!catalog || catalog.inputHash !== inputHash(entries, model)
      || !OUTPUTS.every((filePath) => entries.some((entry) => entry.path === filePath)))
    {
      throw new Error("Committed content artifacts are stale. Stage your sources, run npm run content:prepare, and commit the generated artifacts before pushing.");
    }
  }
  finally
  {
    await rm(workspace, { recursive: true, force: true });
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url))
{
  const operation = process.argv.includes("--check") ? checkPreparedContent : prepareContent;
  operation().catch((error) =>
  {
    console.error(error.message);
    process.exitCode = 1;
  });
}
