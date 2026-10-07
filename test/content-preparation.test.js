import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import filesystem, { access, chmod, copyFile, cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { CATALOG_PATH, buildContentCatalog } from "../scripts/content-catalog.mjs";
import { checkPreparedContent, prepareContent } from "../scripts/prepare-content.mjs";
import { installHooks } from "../scripts/install-hooks.mjs";

const execute = promisify(execFile);
const NOW = "2026-09-03T04:05:06.000Z";
const NEXT_NOW = "2027-10-04T05:06:07.000Z";
const COMMIT_DATE = "2012-03-04T05:06:07+00:00";
const MODEL = "text-embedding-3-small";
const SOURCE_PATH = "src/ideas/example.md";
const OTHER_SOURCE_PATH = "src/ideas/other.md";
const NEW_SOURCE_PATH = "src/ideas/new.md";
const MAP_PATH = "src/_generated/maps/x.svg";
const OUTPUTS = [CATALOG_PATH, "generated/related-content-cache.json", "generated/related-graph-cache.json", "src/_data/related.json"];
const HOOKS = ["pre-commit"];
const EXISTING_HOOKS = [...HOOKS, "pre-push", "post-commit"];
const quietLogger = { log: () => {}, warn: () => {} };
const sourceContent = (body, title = "Example idea") => `---\ntitle: ${title}\ntags: [ideas, searchable]\ntopics: [design]\n---\n\n${body}\n`;

const git = async (repositoryPath, arguments_, environment = process.env) =>
{
  const { stdout } = await execute("git", [
    "--no-pager", "--no-optional-locks", "--literal-pathspecs",
    "-c", "user.name=Content preparation test", "-c", "user.email=content@example.invalid",
    "-c", "commit.gpgSign=false", "-c", "core.hooksPath=/dev/null", "-c", "core.autocrlf=false",
    ...arguments_,
  ], {
    cwd: repositoryPath,
    env: { ...environment, GIT_AUTHOR_DATE: COMMIT_DATE, GIT_COMMITTER_DATE: COMMIT_DATE },
    timeout: 45000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout;
};

const write = async (repositoryPath, filePath, contents) =>
{
  const destination = path.join(repositoryPath, filePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, contents);
};
const readJson = async (repositoryPath, filePath) => JSON.parse(await readFile(path.join(repositoryPath, filePath), "utf8"));
const optionalFile = async (filePath) => readFile(filePath).catch((error) =>
{
  if (error.code !== "ENOENT")
  {
    throw error;
  }
  return null;
});
const stagedPaths = async (repositoryPath) => (await git(repositoryPath, ["diff", "--cached", "--name-only", "-z"])).split("\0").filter(Boolean).sort();
const artifacts = (repositoryPath) => Promise.all([...OUTPUTS, MAP_PATH].map((filePath) => optionalFile(path.join(repositoryPath, filePath))));
const state = async (repositoryPath) => ({
  index: await readFile(path.join(repositoryPath, ".git/index")),
  artifacts: await artifacts(repositoryPath),
  sources: await Promise.all([SOURCE_PATH, OTHER_SOURCE_PATH, "README.md", "generated/unmanaged.json"].map((filePath) => optionalFile(path.join(repositoryPath, filePath)))),
});

// One environment wrapper isolates both fixture Git and production subprocesses.
// Tests are sequential because the exported APIs inherit process.env.
const createFixture = async (context, { initialize = true, prepared = false } = {}) =>
{
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "hgc-content-preparation-"));
  const repositoryPath = path.join(workspacePath, "repository");
  const isIsolated = (name) => name.startsWith("GIT_") || name.toLowerCase().startsWith("npm_config_")
    || ["HOME", "XDG_CONFIG_HOME", "PATH", "NODE_OPTIONS", "OPENAI_API_KEY", "OPENAI_EMBEDDING_MODEL"].includes(name);
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([name]) => isIsolated(name)));
  context.after(async () =>
  {
    for (const name of Object.keys(process.env).filter(isIsolated))
    {
      delete process.env[name];
    }
    Object.assign(process.env, inherited);
    await rm(workspacePath, { recursive: true, force: true });
  });
  for (const name of Object.keys(process.env).filter((name) => isIsolated(name) && name !== "PATH"))
  {
    delete process.env[name];
  }
  for (const directory of [repositoryPath, path.join(workspacePath, "home"), path.join(workspacePath, "config")])
  {
    await mkdir(directory);
  }
  const globalConfigPath = path.join(workspacePath, "gitconfig");
  await writeFile(globalConfigPath, "");
  Object.assign(process.env, {
    HOME: path.join(workspacePath, "home"), XDG_CONFIG_HOME: path.join(workspacePath, "config"),
    GIT_CONFIG_GLOBAL: globalConfigPath, GIT_CONFIG_NOSYSTEM: "1", GIT_CEILING_DIRECTORIES: workspacePath,
    GIT_EDITOR: "true", GIT_TERMINAL_PROMPT: "0",
    npm_config_cache: path.join(workspacePath, "npm-cache"), npm_config_offline: "true",
    npm_config_audit: "false", npm_config_fund: "false", npm_config_ignore_scripts: "false", npm_config_script_shell: "/bin/sh",
  });
  if (initialize)
  {
    await git(repositoryPath, ["init", "--initial-branch=main", "--template="]);
    for (const [filePath, contents] of Object.entries({
      ".gitignore": ".cache/\nnode_modules\n_site/\nfake-fetch.mjs\n",
      "package.json": '{"type":"module"}\n',
      [SOURCE_PATH]: sourceContent("Original committed body."),
      [OTHER_SOURCE_PATH]: sourceContent("Original other body.", "Other idea"),
      "README.md": "Original README.\n", "generated/unmanaged.json": '{"original":true}\n',
    }))
    {
      await write(repositoryPath, filePath, contents);
    }
    await git(repositoryPath, ["add", "--all"]);
    await git(repositoryPath, ["commit", "-m", "Create content fixture"]);
    if (prepared)
    {
      await prepare(repositoryPath);
      await git(repositoryPath, ["commit", "-m", "Commit prepared artifacts"]);
    }
  }
  return { repositoryPath, workspacePath, globalConfigPath };
};

// Fingerprint-bearing outputs keep publication tests independent of Eleventy and OpenAI.
const writePreparedSnapshot = async ({ snapshotPath, sources, inputHash, model }) =>
{
  await write(snapshotPath, CATALOG_PATH, JSON.stringify(buildContentCatalog({ sources, inputHash, embeddingModel: model })) + "\n");
  for (const filePath of OUTPUTS.slice(1))
  {
    await write(snapshotPath, filePath, JSON.stringify({ inputHash, model }) + "\n");
  }
  await write(snapshotPath, MAP_PATH, `<svg><desc>${inputHash}</desc></svg>\n`);
};
const prepare = (repositoryPath, options = {}) => prepareContent({
  repositoryPath, now: NOW, model: MODEL, logger: quietLogger, processSnapshot: writePreparedSnapshot, ...options,
});
const assertStagedArtifacts = async (repositoryPath, filePaths = [...OUTPUTS, MAP_PATH]) =>
{
  for (const filePath of filePaths)
  {
    assert.equal(await git(repositoryPath, ["show", `:${filePath}`]), await readFile(path.join(repositoryPath, filePath), "utf8"), filePath);
  }
};

test("preparation reads exact staged hunks, preserves unstaged work, and stages only managed outputs", async (context) =>
{
  const { repositoryPath } = await createFixture(context);
  const stagedSource = sourceContent("Staged body only.");
  const workingSource = sourceContent("Staged body only.\nUnstaged body must survive.");
  await write(repositoryPath, SOURCE_PATH, stagedSource);
  await write(repositoryPath, "README.md", "Staged README.\n");
  await write(repositoryPath, "generated/unmanaged.json", '{"staged":true}\n');
  await git(repositoryPath, ["add", "--", SOURCE_PATH, "README.md", "generated/unmanaged.json"]);
  await write(repositoryPath, SOURCE_PATH, workingSource);
  await write(repositoryPath, OTHER_SOURCE_PATH, sourceContent("Unstaged other body."));
  await write(repositoryPath, "README.md", "Staged README.\nUnstaged README.\n");
  const before = await state(repositoryPath);
  const sourceEntries = await git(repositoryPath, ["ls-files", "--stage", "--", "src/ideas", "README.md", "generated/unmanaged.json"]);
  const result = await prepare(repositoryPath, { processSnapshot: async (snapshot) =>
  {
    assert.equal(await readFile(path.join(snapshot.snapshotPath, SOURCE_PATH), "utf8"), stagedSource);
    assert.equal(await readFile(path.join(snapshot.snapshotPath, OTHER_SOURCE_PATH), "utf8"), await git(repositoryPath, ["show", `HEAD:${OTHER_SOURCE_PATH}`]));
    assert.equal(await readFile(path.join(snapshot.snapshotPath, "README.md"), "utf8"), "Staged README.\n");
    await writePreparedSnapshot(snapshot);
    await write(snapshot.snapshotPath, SOURCE_PATH, "Snapshot-only mutation.\n");
    await write(snapshot.snapshotPath, "generated/unmanaged.json", "Snapshot-only mutation.\n");
    await write(snapshot.snapshotPath, "generated/scratch.json", "{}\n");
  } });
  assert.deepEqual(result.changed.sort(), [...OUTPUTS, MAP_PATH].sort());
  assert.deepEqual((await state(repositoryPath)).sources, before.sources);
  assert.equal(await git(repositoryPath, ["ls-files", "--stage", "--", "src/ideas", "README.md", "generated/unmanaged.json"]), sourceEntries);
  assert.deepEqual(await stagedPaths(repositoryPath), [...OUTPUTS, MAP_PATH, SOURCE_PATH, "README.md", "generated/unmanaged.json"].sort());
  assert.equal(await optionalFile(path.join(repositoryPath, "generated/scratch.json")), null);
  await assertStagedArtifacts(repositoryPath);
});

test("Git backfill and staged renames retain provenance, while new dates become durable only when committed", async (context) =>
{
  const { repositoryPath } = await createFixture(context);
  const historicalDate = (await git(repositoryPath, ["show", "--no-patch", "--format=%aI", "HEAD"])).trim();
  const renamedPath = "src/ideas/renamed.md";
  const movedPath = "src/ideas/moved-again.md";
  await git(repositoryPath, ["mv", SOURCE_PATH, renamedPath]);
  await write(repositoryPath, NEW_SOURCE_PATH, sourceContent("New idea."));
  await git(repositoryPath, ["add", "--", NEW_SOURCE_PATH]);
  await prepare(repositoryPath);
  const first = await readJson(repositoryPath, CATALOG_PATH);
  assert.deepEqual(first.sources[renamedPath], { created: historicalDate, origin: "git" });
  assert.deepEqual(first.sources[OTHER_SOURCE_PATH], first.sources[renamedPath]);
  assert.deepEqual(first.sources[NEW_SOURCE_PATH], { created: NOW, origin: "prepared" });
  assert.equal(Object.hasOwn(first.sources, SOURCE_PATH), false);
  await prepare(repositoryPath, { now: NEXT_NOW });
  const committed = await readJson(repositoryPath, CATALOG_PATH);
  assert.deepEqual(committed.sources[NEW_SOURCE_PATH], { created: NEXT_NOW, origin: "prepared" });
  await git(repositoryPath, ["commit", "-m", "Commit renamed and new content with dates"]);
  await git(repositoryPath, ["mv", renamedPath, movedPath]);
  await write(repositoryPath, NEW_SOURCE_PATH, sourceContent("Later new-idea edit."));
  await git(repositoryPath, ["add", "--", NEW_SOURCE_PATH]);
  await prepare(repositoryPath, { now: "2028-01-02T03:04:05.000Z" });
  const later = await readJson(repositoryPath, CATALOG_PATH);
  assert.deepEqual(later.sources[movedPath], committed.sources[renamedPath]);
  assert.deepEqual(later.sources[NEW_SOURCE_PATH], committed.sources[NEW_SOURCE_PATH]);
  assert.notEqual(later.inputHash, committed.inputHash);
});

test("a failed snapshot callback leaves the index, artifacts, and working sources unchanged", async (context) =>
{
  const { repositoryPath } = await createFixture(context, { prepared: true });
  await write(repositoryPath, SOURCE_PATH, sourceContent("Staged edit."));
  await git(repositoryPath, ["add", "--", SOURCE_PATH]);
  await write(repositoryPath, SOURCE_PATH, sourceContent("Unstaged edit."));
  const before = await state(repositoryPath);
  const failure = new Error("Deliberate callback failure.");
  await assert.rejects(prepare(repositoryPath, { processSnapshot: async (snapshot) =>
  {
    await writePreparedSnapshot(snapshot);
    throw failure;
  } }), (error) => error === failure);
  assert.deepEqual(await state(repositoryPath), before);
  assert.deepEqual(await readdir(path.join(repositoryPath, ".cache")), []);
});

for (const scenario of ["dirty tracked", "deleted tracked", "untracked"])
{
  test(`preparation refuses a ${scenario} generated artifact without partial publication`, async (context) =>
  {
    const { repositoryPath } = await createFixture(context, { prepared: scenario !== "untracked" });
    const artifactPath = path.join(repositoryPath, OUTPUTS[3]);
    await write(repositoryPath, SOURCE_PATH, sourceContent("Staged edit."));
    await git(repositoryPath, ["add", "--", SOURCE_PATH]);
    if (scenario === "deleted tracked")
    {
      await rm(artifactPath);
    }
    else
    {
      await write(repositoryPath, OUTPUTS[3], '{"userEdit":true}\n');
    }
    const before = await state(repositoryPath);
    await assert.rejects(prepare(repositoryPath), /generated.*src\/_data\/related\.json/i);
    assert.deepEqual(await state(repositoryPath), before);
  });
}

test("a concurrent index update is refused and the newer staged work is preserved", async (context) =>
{
  const { repositoryPath } = await createFixture(context, { prepared: true });
  await write(repositoryPath, SOURCE_PATH, sourceContent("Staged edit."));
  await git(repositoryPath, ["add", "--", SOURCE_PATH]);
  await write(repositoryPath, "README.md", "Concurrent staged README.\n");
  const before = await state(repositoryPath);
  let concurrent;
  await assert.rejects(prepare(repositoryPath, { processSnapshot: async (snapshot) =>
  {
    await writePreparedSnapshot(snapshot);
    await git(repositoryPath, ["add", "--", "README.md"]);
    concurrent = await state(repositoryPath);
  } }), /Git index changed during preparation/);
  assert.notDeepEqual(concurrent.index, before.index);
  assert.deepEqual(concurrent.artifacts, before.artifacts);
  assert.deepEqual(await state(repositoryPath), concurrent);
  assert.deepEqual(await stagedPaths(repositoryPath), ["README.md", SOURCE_PATH].sort());
});

test("an index publication failure rolls back already published artifacts", async (context) =>
{
  const { repositoryPath } = await createFixture(context, { prepared: true });
  await write(repositoryPath, SOURCE_PATH, sourceContent("Staged edit."));
  await git(repositoryPath, ["add", "--", SOURCE_PATH]);
  const before = await state(repositoryPath);
  const failure = new Error("Deliberate index publication failure.");
  const originalRename = filesystem.rename;
  let failed = false;
  const mocked = context.mock.method(filesystem, "rename", async (source, destination) =>
  {
    if (!failed && destination === path.join(repositoryPath, ".git/index"))
    {
      failed = true;
      assert.notDeepEqual(await artifacts(repositoryPath), before.artifacts);
      throw failure;
    }
    return originalRename(source, destination);
  });
  syncBuiltinESMExports();
  try
  {
    await assert.rejects(prepare(repositoryPath), (error) => error === failure);
  }
  finally
  {
    mocked.mock.restore();
    syncBuiltinESMExports();
  }
  assert.ok(failed);
  assert.deepEqual(await state(repositoryPath), before);
  assert.equal(await optionalFile(path.join(repositoryPath, ".git/index.lock")), null);
});

test("an alternate GIT_INDEX_FILE is rejected before the worker or any publication", async (context) =>
{
  const { repositoryPath, workspacePath } = await createFixture(context);
  const temporaryIndex = path.join(workspacePath, "alternate-index");
  await copyFile(path.join(repositoryPath, ".git/index"), temporaryIndex);
  const originalIndex = await readFile(temporaryIndex);
  const before = await state(repositoryPath);
  process.env.GIT_INDEX_FILE = temporaryIndex;
  await assert.rejects(prepare(repositoryPath, { processSnapshot: () => assert.fail("The worker must not run.") }), (error) =>
  {
    assert.match(error.message, /--only/);
    assert.match(error.message, /ordinary staged.*git commit/i);
    return true;
  });
  delete process.env.GIT_INDEX_FILE;
  assert.deepEqual(await readFile(temporaryIndex), originalIndex);
  assert.deepEqual(await state(repositoryPath), before);
  assert.deepEqual(await readdir(path.join(repositoryPath, ".cache")), []);
});

test("freshness checks use committed artifacts, not newly staged or dirty work", async (context) =>
{
  const { repositoryPath } = await createFixture(context);
  const check = () => checkPreparedContent({ repositoryPath, model: MODEL });
  await prepare(repositoryPath);
  await assert.rejects(check(), /Committed content artifacts are stale/);
  await git(repositoryPath, ["commit", "-m", "Commit prepared artifacts"]);
  await write(repositoryPath, SOURCE_PATH, sourceContent("New staged work."));
  await write(repositoryPath, CATALOG_PATH, '{"invalidStagedCatalog":true}\n');
  await git(repositoryPath, ["add", "--", SOURCE_PATH, CATALOG_PATH]);
  await write(repositoryPath, SOURCE_PATH, sourceContent("New unstaged work."));
  await write(repositoryPath, CATALOG_PATH, "Invalid working-tree JSON.\n");
  const before = await state(repositoryPath);
  await check();
  await assert.rejects(checkPreparedContent({ repositoryPath, model: "different-model" }), /Committed content artifacts are stale/);
  assert.deepEqual(await state(repositoryPath), before);
  await git(repositoryPath, ["restore", "--staged", "--worktree", "--", CATALOG_PATH]);
  await git(repositoryPath, ["commit", "-m", "Commit source without preparation"]);
  await assert.rejects(check(), /Committed content artifacts are stale/);
  await prepare(repositoryPath);
  await assert.rejects(check(), /Committed content artifacts are stale/);
  await git(repositoryPath, ["commit", "-m", "Commit refreshed artifacts"]);
  await check();
});

for (const scenario of ["install", "local custom", "global custom", ...EXISTING_HOOKS, "no Git"])
{
  test(`hook installer: ${scenario}`, async (context) =>
  {
    const { repositoryPath, globalConfigPath } = await createFixture(context, { initialize: scenario !== "no Git" });
    const warnings = [];
    const logger = { log: () => {}, warn: (message) => warnings.push(message) };
    if (scenario === "no Git")
    {
      process.env.PATH = repositoryPath;
      assert.deepEqual(await installHooks({ repositoryPath, logger }), { installed: false });
      assert.deepEqual(await readdir(repositoryPath), []);
      assert.deepEqual(warnings, []);
      return;
    }
    for (const hook of HOOKS)
    {
      await write(repositoryPath, `.githooks/${hook}`, "#!/bin/sh\nexit 0\n");
      await chmod(path.join(repositoryPath, ".githooks", hook), 0o644);
    }
    await git(repositoryPath, ["add", "--", ".githooks"]);
    if (scenario.endsWith("custom"))
    {
      await git(repositoryPath, ["config", `--${scenario.split(" ")[0]}`, "core.hooksPath", "custom hooks"]);
    }
    if (EXISTING_HOOKS.includes(scenario))
    {
      await write(repositoryPath, `.git/hooks/${scenario}`, "#!/bin/sh\n# Existing integration.\nexit 0\n");
      await chmod(path.join(repositoryPath, ".git/hooks", scenario), 0o700);
    }
    const configurations = () => Promise.all([".git/config", globalConfigPath].map((filePath) => readFile(path.resolve(repositoryPath, filePath), "utf8")));
    const before = await configurations();
    assert.deepEqual(await installHooks({ repositoryPath, logger }), { installed: scenario === "install" });
    for (const hook of HOOKS)
    {
      assert.equal((await stat(path.join(repositoryPath, ".githooks", hook))).mode & 0o777, scenario === "install" ? 0o755 : 0o644);
      assert.equal(await readFile(path.join(repositoryPath, ".githooks", hook), "utf8"), "#!/bin/sh\nexit 0\n");
    }
    if (scenario === "install")
    {
      assert.equal((await git(repositoryPath, ["config", "--local", "--get", "core.hooksPath"])).trim(), ".githooks");
      assert.equal(await readFile(globalConfigPath, "utf8"), "");
      const installed = await configurations();
      assert.deepEqual(await installHooks({ repositoryPath, logger }), { installed: true });
      assert.deepEqual(await configurations(), installed);
      assert.deepEqual(warnings, []);
    }
    else
    {
      assert.deepEqual(await configurations(), before);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /preserved/);
      if (EXISTING_HOOKS.includes(scenario))
      {
        assert.equal(await readFile(path.join(repositoryPath, ".git/hooks", scenario), "utf8"), "#!/bin/sh\n# Existing integration.\nexit 0\n");
        assert.equal((await stat(path.join(repositoryPath, ".git/hooks", scenario))).mode & 0o777, 0o700);
      }
    }
  });
}

test("npm ci runs the prepare launcher without repository scripts or Git", { timeout: 30000 }, async (context) =>
{
  let npmPath;
  for (const directory of process.env.PATH.split(path.delimiter))
  {
    const candidate = path.join(directory, "npm");
    if (await access(candidate, constants.X_OK).then(() => true, () => false))
    {
      npmPath = await realpath(candidate);
      break;
    }
  }
  assert.ok(npmPath, "npm must be installed to test its lifecycle launcher.");
  const { repositoryPath, workspacePath } = await createFixture(context, { initialize: false });
  const { scripts: { prepare: launcher } } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const packageData = { name: "fixture", version: "1.0.0", scripts: { prepare: launcher } };
  await write(repositoryPath, "package.json", JSON.stringify(packageData));
  await write(repositoryPath, "package-lock.json", JSON.stringify({
    name: "fixture", version: "1.0.0", lockfileVersion: 3, requires: true,
    packages: { "": { name: "fixture", version: "1.0.0", hasInstallScript: true } },
  }));
  const executablePath = path.join(workspacePath, "bin");
  await mkdir(executablePath);
  await symlink(process.execPath, path.join(executablePath, "node"));
  process.env.PATH = executablePath;
  await assert.rejects(execute("git", ["--version"], { timeout: 10000 }), { code: "ENOENT" });
  const { stdout, stderr } = await execute(process.execPath, [npmPath, "ci", "--offline", "--no-audit", "--no-fund"], {
    cwd: repositoryPath, timeout: 20000,
  });
  assert.match(stdout, /^> .* prepare$/m);
  assert.equal(stderr, "");
  assert.deepEqual(await readJson(repositoryPath, "package.json"), packageData);
  assert.equal(await optionalFile(path.join(repositoryPath, "scripts/install-hooks.mjs")), null);
  assert.equal(await optionalFile(path.join(repositoryPath, ".git")), null);
});

test("preparation failure does not block a commit or push without prepared artifacts", async (context) =>
{
  const { repositoryPath, workspacePath } = await createFixture(context);
  await write(repositoryPath, "package.json", JSON.stringify({
    type: "module",
    scripts: { "content:prepare": "node -e \"console.error('Embedding key unavailable'); process.exit(1)\"" },
  }));
  await mkdir(path.join(repositoryPath, ".githooks"), { recursive: true });
  await copyFile(new URL("../.githooks/pre-commit", import.meta.url), path.join(repositoryPath, ".githooks/pre-commit"));
  await installHooks({ repositoryPath, logger: quietLogger });
  await write(repositoryPath, SOURCE_PATH, sourceContent("Content published without preparation."));
  await git(repositoryPath, ["add", "--", SOURCE_PATH]);
  const { stderr } = await execute("git", [
    "--no-pager", "-c", "core.hooksPath=.githooks", "-c", "commit.gpgSign=false",
    "-c", "user.name=Content preparation test", "-c", "user.email=content@example.invalid",
    "commit", "-m", "Publish despite preparation failure",
  ], { cwd: repositoryPath, env: process.env, timeout: 20000 });
  assert.match(stderr, /continuing with cached related data/);
  assert.match(await git(repositoryPath, ["show", `HEAD:${SOURCE_PATH}`]), /Content published without preparation/);
  assert.equal(await optionalFile(path.join(repositoryPath, ".githooks/pre-push")), null);

  const remote = path.join(workspacePath, "remote.git");
  await git(repositoryPath, ["init", "--bare", "--template=", remote]);
  await git(repositoryPath, ["-c", "core.hooksPath=.githooks", "push", remote, "HEAD:refs/heads/main"]);
});

// Copy only production code and miniature content; never primary generated metadata.
const setupRealWorker = async (repositoryPath) =>
{
  for (const filePath of [
    "scripts/prepare-content.mjs", "scripts/content-catalog.mjs", "scripts/related-content.js",
    "src/_data/gitDates.js", "src/search/records.json.11ty.js", ...HOOKS.map((hook) => `.githooks/${hook}`),
  ])
  {
    await mkdir(path.dirname(path.join(repositoryPath, filePath)), { recursive: true });
    await copyFile(new URL(`../${filePath}`, import.meta.url), path.join(repositoryPath, filePath));
  }
  await cp(new URL("../eleventy/", import.meta.url), path.join(repositoryPath, "eleventy"), { recursive: true });
  await symlink(fileURLToPath(new URL("../node_modules", import.meta.url)), path.join(repositoryPath, "node_modules"), "dir");
  const { scripts } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  await write(repositoryPath, "package.json", JSON.stringify({ type: "module", scripts: { "content:prepare": scripts["content:prepare"] } }));
  await write(repositoryPath, ".eleventy.js", `
import contentRecordsPlugin from "./eleventy/content-records.js";
import markdownPlugin from "./eleventy/markdown.js";
export default (eleventyConfig) =>
{
  eleventyConfig.setQuietMode(true);
  eleventyConfig.addPlugin(contentRecordsPlugin);
  eleventyConfig.addPlugin(markdownPlugin);
  eleventyConfig.addCollection("searchable", (collection) => collection.getFilteredByTag("searchable"));
  eleventyConfig.addGlobalData("eleventyComputed.contentDate", () => (data) => data.gitDates[data.page.inputPath.replace(/^\\.\\//, "")] || null);
  return { dir: { input: "src", output: "_site" }, templateFormats: ["md", "11ty.js"], markdownTemplateEngine: "njk" };
};
`);
  await git(repositoryPath, ["add", "--all"]);
  await git(repositoryPath, ["commit", "-m", "Add miniature production worker and hooks"]);
  await installHooks({ repositoryPath, logger: quietLogger });
  await write(repositoryPath, ".cache/fetch-events.ndjson", "");
  await write(repositoryPath, "fake-fetch.mjs", `
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile } from "node:fs/promises";
const log = (event) => appendFile(process.env.FIXTURE_FETCH_LOG, JSON.stringify({ ...event, cwd: process.cwd() }) + "\\n");
await log({ type: "loaded" });
// Never fall through to real fetch, including for unexpected endpoints.
globalThis.fetch = async (resource, options) =>
{
  assert.equal(resource instanceof Request ? resource.url : String(resource), "https://api.openai.com/v1/embeddings");
  assert.equal(options.method, "POST");
  assert.equal(options.headers.Authorization, "Bearer fixture-only-key");
  const { input, model } = JSON.parse(options.body);
  assert.equal(model, ${JSON.stringify(MODEL)});
  await log({ type: "embeddings", input });
  const data = input.map((text, index) =>
  {
    const digest = createHash("sha256").update(text).digest();
    const values = Array.from({ length: 1536 }, (_, dimension) => (digest[dimension % digest.length] + 1) / 256);
    const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
    return { index, embedding: values.map((value) => value / magnitude) };
  });
  return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
};
`);
  return {
    ...process.env, NODE_OPTIONS: `--import=${pathToFileURL(path.join(repositoryPath, "fake-fetch.mjs")).href}`,
    OPENAI_API_KEY: "fixture-only-key", OPENAI_EMBEDDING_MODEL: MODEL,
    FIXTURE_FETCH_LOG: path.join(repositoryPath, ".cache/fetch-events.ndjson"),
  };
};

const runRealPreparation = async (repositoryPath, environment, now) =>
{
  const { stdout } = await execute(process.execPath, ["--input-type=module", "--eval", `
    import { prepareContent } from "./scripts/prepare-content.mjs";
    console.log("RESULT:" + JSON.stringify(await prepareContent({ now: ${JSON.stringify(now)} })));
  `], { cwd: repositoryPath, env: environment, timeout: 45000, maxBuffer: 4 * 1024 * 1024 });
  return JSON.parse(stdout.match(/^RESULT:(.+)$/m)[1]);
};

test("default worker reuses vectors for new dates and pre-commit prepares artifacts with staged hunks", { timeout: 120000 }, async (context) =>
{
  const { repositoryPath } = await createFixture(context);
  const environment = await setupRealWorker(repositoryPath);
  const historicalDate = (await git(repositoryPath, ["show", "--no-patch", "--format=%aI", "HEAD"])).trim();
  const stagedSource = sourceContent("Staged body only.");
  const workingSource = sourceContent("Staged body only.\nUnstaged body must survive.");
  await write(repositoryPath, SOURCE_PATH, stagedSource);
  await write(repositoryPath, NEW_SOURCE_PATH, sourceContent("New staged design idea.", "New idea"));
  await git(repositoryPath, ["add", "--", SOURCE_PATH, NEW_SOURCE_PATH]);
  await write(repositoryPath, SOURCE_PATH, workingSource);
  const head = await git(repositoryPath, ["rev-parse", "HEAD"]);
  const sourceIndex = await git(repositoryPath, ["ls-files", "--stage", "--", "src/ideas"]);
  const hookCommit = (arguments_) => git(repositoryPath, ["-c", "core.hooksPath=.githooks", "commit", ...arguments_], environment);
  const events = async () => (await readFile(environment.FIXTURE_FETCH_LOG, "utf8")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const first = await runRealPreparation(repositoryPath, environment, NOW);
  assert.deepEqual(first.changed.sort(), [...OUTPUTS].sort());
  const catalog = await readJson(repositoryPath, CATALOG_PATH);
  assert.deepEqual(catalog.sources[SOURCE_PATH], { created: historicalDate, origin: "git" });
  assert.deepEqual(catalog.sources[NEW_SOURCE_PATH], { created: NOW, origin: "prepared" });
  assert.equal(catalog.records["/ideas/example/"].title, "Example idea");
  assert.equal(catalog.records["/ideas/new/"].contentDate, NOW);
  const firstRequests = (await events()).filter((event) => event.type === "embeddings");
  assert.equal(firstRequests.length, 1);
  assert.equal(firstRequests[0].input.length, 3);
  assert.ok(firstRequests[0].input.some((input) => input.includes("Staged body only.")));
  assert.ok(firstRequests[0].input.every((input) => !input.includes("Unstaged body must survive.")));
  const cache = await readJson(repositoryPath, OUTPUTS[1]);
  assert.deepEqual(Object.keys(cache.embeddings).sort(), Object.values(catalog.records).map((record) => record.textHash).sort());
  assert.equal(Buffer.from(Object.values(cache.embeddings)[0].embedding, "base64").byteLength, 1536 * Float32Array.BYTES_PER_ELEMENT);
  const originalVectorsAndLinks = await Promise.all(OUTPUTS.slice(1).map((filePath) => readFile(path.join(repositoryPath, filePath))));
  const second = await runRealPreparation(repositoryPath, environment, NEXT_NOW);
  assert.deepEqual(second.changed, [CATALOG_PATH]);
  const nextCatalog = await readJson(repositoryPath, CATALOG_PATH);
  assert.deepEqual(nextCatalog.sources[NEW_SOURCE_PATH], { created: NEXT_NOW, origin: "prepared" });
  assert.equal(nextCatalog.records["/ideas/new/"].contentDate, NEXT_NOW);
  assert.equal(nextCatalog.records["/ideas/new/"].textHash, catalog.records["/ideas/new/"].textHash);
  assert.equal(nextCatalog.records["/ideas/new/"].relationshipHash, catalog.records["/ideas/new/"].relationshipHash);
  assert.notEqual(nextCatalog.records["/ideas/new/"].presentationHash, catalog.records["/ideas/new/"].presentationHash);
  assert.deepEqual(await Promise.all(OUTPUTS.slice(1).map((filePath) => readFile(path.join(repositoryPath, filePath)))), originalVectorsAndLinks);
  assert.deepEqual((await events()).filter((event) => event.type === "embeddings"), firstRequests);
  const workerLoads = (await events()).filter((event) => event.type === "loaded" && event.cwd !== repositoryPath);
  assert.equal(workerLoads.length, 2, "Both dates must pass through the actual --worker path.");
  for (const event of workerLoads)
  {
    assert.match(path.relative(repositoryPath, event.cwd).split(path.sep).join("/"), /^\.cache\/content-prepare-[^/]+\/snapshot$/);
  }
  const graph = await readJson(repositoryPath, OUTPUTS[2]);
  const related = await readJson(repositoryPath, OUTPUTS[3]);
  assert.deepEqual(Object.keys(graph.records).sort(), Object.keys(catalog.records).sort());
  assert.ok(related.sources["/ideas/new/"].related.length > 0);
  assert.equal(await git(repositoryPath, ["ls-files", "--stage", "--", "src/ideas"]), sourceIndex);
  assert.deepEqual(await stagedPaths(repositoryPath), [...OUTPUTS, SOURCE_PATH, NEW_SOURCE_PATH].sort());
  await assertStagedArtifacts(repositoryPath, OUTPUTS);
  // Remove our test preparation so the real hook must generate and stage every output itself.
  await git(repositoryPath, ["restore", "--staged", "--", ...OUTPUTS]);
  await Promise.all(OUTPUTS.map((filePath) => rm(path.join(repositoryPath, filePath))));
  assert.deepEqual(await stagedPaths(repositoryPath), [SOURCE_PATH, NEW_SOURCE_PATH].sort());
  await hookCommit(["-m", "Ordinary staged commit with prepared artifacts"]);
  assert.equal((await events()).filter((event) => event.type === "loaded" && event.cwd !== repositoryPath).length, 3);
  assert.equal(await git(repositoryPath, ["rev-parse", "HEAD^"]), head);
  assert.deepEqual((await git(repositoryPath, ["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", "HEAD"])).split("\0").filter(Boolean).sort(), [...OUTPUTS, SOURCE_PATH, NEW_SOURCE_PATH].sort());
  for (const filePath of OUTPUTS)
  {
    assert.equal(await git(repositoryPath, ["show", `HEAD:${filePath}`]), await readFile(path.join(repositoryPath, filePath), "utf8"), filePath);
  }
  assert.equal(await git(repositoryPath, ["show", `HEAD:${SOURCE_PATH}`]), stagedSource);
  assert.equal(await readFile(path.join(repositoryPath, SOURCE_PATH), "utf8"), workingSource);
  assert.deepEqual(await stagedPaths(repositoryPath), []);
  await checkPreparedContent({ repositoryPath, model: MODEL });
  assert.deepEqual((await readdir(path.join(repositoryPath, ".cache"))).filter((name) => name.startsWith("content-prepare-")), []);
});
