import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { generateGitDates, httpsRemote } from "../scripts/git-dates.mjs";

const execute = promisify(execFile);
const CREATED_DATE = "2001-02-03T04:05:06+00:00";
const MODIFIED_DATE = "2012-03-04T05:06:07+00:00";
const LATEST_DATE = "2024-04-05T06:07:08+00:00";
const quietLogger = { log: () => {} };

// Keep fixture Git commands independent of inherited repository settings and signing hooks.
const gitEnvironment = {
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_"))),
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_EDITOR: "true",
  GIT_TERMINAL_PROMPT: "0",
};

const git = async (repositoryPath, arguments_, environment = {}) =>
{
  const { stdout } = await execute("git", [
    "--no-pager",
    "--no-optional-locks",
    "-c", "commit.gpgSign=false",
    "-c", "core.hooksPath=/dev/null",
    "-c", "user.name=Git dates test",
    "-c", "user.email=git-dates@example.invalid",
    ...arguments_,
  ], {
    cwd: repositoryPath,
    env: { ...gitEnvironment, ...environment },
    timeout: 10000,
  });
  return stdout.trim();
};

const createDirectory = async (context) =>
{
  const directory = await mkdtemp(path.join(os.tmpdir(), "hgc-git-dates-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
};

const initializeRepository = async (repositoryPath) =>
{
  await mkdir(repositoryPath, { recursive: true });
  await git(repositoryPath, ["init", "--initial-branch=main", "--template="]);
  return repositoryPath;
};

const createRepository = async (context) =>
{
  return initializeRepository(await createDirectory(context));
};

const writeSource = async (repositoryPath, sourcePath, content = "Original content.\n") =>
{
  const filePath = path.join(repositoryPath, sourcePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
};

const commit = async (repositoryPath, message, authorDate, committerDate = authorDate) =>
{
  await git(repositoryPath, ["add", "--all"]);
  await git(repositoryPath, ["commit", "-m", message], {
    GIT_AUTHOR_DATE: authorDate,
    GIT_COMMITTER_DATE: committerDate,
  });
  return git(repositoryPath, ["rev-parse", "HEAD"]);
};

// Preserve raw %aI output: Git versions format UTC as either +00:00 or Z.
const readAuthorDate = (repositoryPath) =>
{
  return git(repositoryPath, ["show", "--no-patch", "--format=%aI", "HEAD"]);
};

test("creation dates use the first addition author date rather than later modifications", async (context) =>
{
  const repositoryPath = await createRepository(context);
  await writeSource(repositoryPath, "src/ideas/name.md");
  await commit(repositoryPath, "Add the idea", CREATED_DATE, MODIFIED_DATE);
  const creationDate = await readAuthorDate(repositoryPath);
  await writeSource(repositoryPath, "src/ideas/name.md", "Modified content.\n");
  const head = await commit(repositoryPath, "Modify the idea", LATEST_DATE);

  const metadata = await generateGitDates({ repositoryPath, logger: quietLogger });
  const expected = {
    version: 1,
    commit: head,
    created: { "src/ideas/name.md": creationDate },
  };

  assert.deepEqual(metadata, expected);
  const outputPath = path.join(repositoryPath, "generated/content-dates.json");
  assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), expected);
});

test("renamed sources retain their original creation date", async (context) =>
{
  const repositoryPath = await createRepository(context);
  await writeSource(repositoryPath, "src/ideas/original.md");
  await commit(repositoryPath, "Add the original idea", CREATED_DATE);
  const creationDate = await readAuthorDate(repositoryPath);
  await git(repositoryPath, ["mv", "src/ideas/original.md", "src/ideas/renamed.md"]);
  await commit(repositoryPath, "Rename the idea", MODIFIED_DATE);
  await writeSource(repositoryPath, "src/ideas/renamed.md", "Modified after the rename.\n");
  const head = await commit(repositoryPath, "Modify the renamed idea", LATEST_DATE);

  const metadata = await generateGitDates({ repositoryPath, logger: quietLogger });

  assert.deepEqual(metadata, {
    version: 1,
    commit: head,
    created: { "src/ideas/renamed.md": creationDate },
  });
});

test("sources with multiple additions use the oldest addition date", async (context) =>
{
  const repositoryPath = await createRepository(context);
  await writeSource(repositoryPath, "src/ideas/name.md");
  await commit(repositoryPath, "Add the idea", CREATED_DATE);
  const creationDate = await readAuthorDate(repositoryPath);
  await git(repositoryPath, ["rm", "src/ideas/name.md"]);
  await commit(repositoryPath, "Remove the idea", MODIFIED_DATE);
  await writeSource(repositoryPath, "src/ideas/name.md", "Reintroduced content.\n");
  await commit(repositoryPath, "Restore the idea", LATEST_DATE);

  const metadata = await generateGitDates({ repositoryPath, logger: quietLogger });

  assert.deepEqual(metadata.created, { "src/ideas/name.md": creationDate });
});

test("only eligible HEAD sources are included, excluding dated filenames and private directories", async (context) =>
{
  const repositoryPath = await createRepository(context);
  const includedSources = [
    "src/ideas/name.md",
    "src/pages/index.njk",
    "src/about.html",
    "src/tools/page.11ty.js",
  ];
  const excludedSources = [
    "src/_layouts/base.njk",
    "src/_includes/header.html",
    "src/_data/example.11ty.js",
    "src/_private/nested/name.md",
    "src/notes/2020-01-02-note.md",
    "src/pages/2020-01-02-page.njk",
    "src/pages/2020-01-02-page.html",
    "src/pages/2020-01-02-page.11ty.js",
    "src/code.js",
    "src/info.json",
    "src/style.css",
    "docs/example.md",
    "README.md",
    "src/ideas/removed.md",
  ];
  for (const sourcePath of [...includedSources, ...excludedSources])
  {
    await writeSource(repositoryPath, sourcePath);
  }
  await commit(repositoryPath, "Add source fixtures", CREATED_DATE);
  const creationDate = await readAuthorDate(repositoryPath);
  await git(repositoryPath, ["rm", "src/ideas/removed.md"]);
  const head = await commit(repositoryPath, "Delete an obsolete source", MODIFIED_DATE);

  // HEAD, not the working tree, determines both missing tracked and untracked sources.
  await rm(path.join(repositoryPath, "src/about.html"));
  await writeSource(repositoryPath, "src/ideas/untracked.md");
  const metadata = await generateGitDates({ repositoryPath, logger: quietLogger });

  assert.deepEqual(metadata, {
    version: 1,
    commit: head,
    created: Object.fromEntries(includedSources.map((sourcePath) => [sourcePath, creationDate])),
  });
});

test("the output cache is reused at the same commit and refreshed for a new HEAD", async (context) =>
{
  const repositoryPath = await createRepository(context);
  const outputPath = path.join(repositoryPath, "metadata/dates.json");
  const messages = [];
  const logger = { log: (message) => messages.push(message) };
  await writeSource(repositoryPath, "src/ideas/name.md");
  const firstHead = await commit(repositoryPath, "Add the idea", CREATED_DATE);
  const creationDate = await readAuthorDate(repositoryPath);
  const firstMetadata = await generateGitDates({ repositoryPath, outputPath, logger });

  assert.deepEqual(firstMetadata, {
    version: 1,
    commit: firstHead,
    created: { "src/ideas/name.md": creationDate },
  });
  assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), firstMetadata);
  assert.equal(messages.length, 1);

  // Noncanonical whitespace makes an unnecessary cache rewrite observable without timing checks.
  const cachedOutput = JSON.stringify(firstMetadata);
  await writeFile(outputPath, cachedOutput);
  const cachedMetadata = await generateGitDates({ repositoryPath, outputPath, logger });

  assert.deepEqual(cachedMetadata, firstMetadata);
  assert.equal(await readFile(outputPath, "utf8"), cachedOutput);
  assert.equal(messages.length, 1);

  await writeSource(repositoryPath, "src/ideas/new.md", "New idea.\n");
  await writeSource(repositoryPath, "src/ideas/name.md", "Updated original idea.\n");
  const nextHead = await commit(repositoryPath, "Add another idea and modify the original", MODIFIED_DATE);
  const newCreationDate = await readAuthorDate(repositoryPath);
  const refreshedMetadata = await generateGitDates({ repositoryPath, outputPath, logger });

  assert.notEqual(nextHead, firstHead);
  assert.deepEqual(refreshedMetadata, {
    version: 1,
    commit: nextHead,
    created: {
      "src/ideas/name.md": creationDate,
      "src/ideas/new.md": newCreationDate,
    },
  });
  assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), refreshedMetadata);
  assert.equal(messages.length, 2);
});

test("a shallow local clone fetches full history and finds creation before the shallow boundary", async (context) =>
{
  const directory = await createDirectory(context);
  const originPath = await initializeRepository(path.join(directory, "origin"));
  const clonePath = path.join(directory, "clone");
  await writeSource(originPath, "src/ideas/name.md");
  await commit(originPath, "Add the idea", CREATED_DATE);
  const creationDate = await readAuthorDate(originPath);
  await writeSource(originPath, "src/ideas/name.md", "Modified at the shallow boundary.\n");
  const head = await commit(originPath, "Modify the idea", MODIFIED_DATE);
  const boundaryDate = await readAuthorDate(originPath);

  // file:// is required: cloning a plain local path ignores --depth.
  const originUrl = pathToFileURL(originPath).href;
  await git(directory, ["clone", "--depth", "1", originUrl, clonePath]);
  assert.equal(await git(clonePath, ["remote", "get-url", "origin"]), originUrl);
  assert.equal(await git(clonePath, ["rev-parse", "--is-shallow-repository"]), "true");
  assert.equal(await git(clonePath, ["rev-list", "--count", "HEAD"]), "1");
  assert.equal(await git(clonePath, [
    "log", "--follow", "--diff-filter=A", "--format=%aI", "--", "src/ideas/name.md",
  ]), boundaryDate);

  const metadata = await generateGitDates({ repositoryPath: clonePath, logger: quietLogger });

  assert.equal(await git(clonePath, ["rev-parse", "--is-shallow-repository"]), "false");
  assert.equal(await git(clonePath, ["rev-list", "--count", "HEAD"]), "2");
  assert.equal(await git(clonePath, ["rev-parse", "HEAD"]), head);
  assert.deepEqual(metadata, {
    version: 1,
    commit: head,
    created: { "src/ideas/name.md": creationDate },
  });
  const outputPath = path.join(clonePath, "generated/content-dates.json");
  assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), metadata);
});

test("generation fails without a Git repository", async (context) =>
{
  const repositoryPath = await createDirectory(context);
  await writeSource(repositoryPath, "src/ideas/name.md");

  await assert.rejects(
    generateGitDates({ repositoryPath, logger: quietLogger }),
    /Cannot generate publication dates without Git history/,
  );
});

test("generation fails in an initialized repository with no commits", async (context) =>
{
  const repositoryPath = await createRepository(context);
  await writeSource(repositoryPath, "src/ideas/name.md");

  await assert.rejects(
    generateGitDates({ repositoryPath, logger: quietLogger }),
    /Cannot generate publication dates without Git history/,
  );
});

for (const [description, remote, expected] of [
  ["SCP-style SSH", "git@github.com:gerwitz/hgc-12.git", "https://github.com/gerwitz/hgc-12.git"],
  ["SSH URLs", "ssh://git@github.com/gerwitz/hgc-12.git", "https://github.com/gerwitz/hgc-12.git"],
  ["nested paths on other hosts", "git@git.example.com:team/nested/site.git", "https://git.example.com/team/nested/site.git"],
  ["existing HTTPS URLs", "https://github.com/gerwitz/hgc-12.git", "https://github.com/gerwitz/hgc-12.git"],
  ["local file URLs", "file:///tmp/git-dates-origin", "file:///tmp/git-dates-origin"],
])
{
  test(`httpsRemote handles ${description}`, () =>
  {
    assert.equal(httpsRemote(remote), expected);
  });
}
