import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fileSystem from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import test from "node:test";

import { createContentRecord } from "../eleventy/content-records.js";
import { buildContentCatalog, CATALOG_PATH, creationDates, readContentCatalog } from "../scripts/content-catalog.mjs";
import loadDates from "../src/_data/gitDates.js";

const CREATED_DATE = "2001-02-03T04:05:06+00:00";
const NOW = "2026-10-06T12:00:00.000Z";
const MODEL = "text-embedding-3-small";

const createRecord = (overrides = {}) =>
{
  return {
    inputPath: "./src/ideas/example.md",
    title: "Example idea",
    kind: "ideas",
    categories: ["Design"],
    topics: ["interfaces"],
    contentDate: null,
    description: "An example idea.",
    previewIconName: "other",
    wordCount: 3,
    textHash: "text-hash",
    relationshipHash: "relationship-hash",
    presentationHash: "presentation-hash",
    url: "/ideas/example/",
    text: "Private body text.",
    searchBodyHtml: "<p>Private body text.</p>",
    embeddingText: "Private embedding input.",
    embedding: [0.1, 0.2],
    vector: [0.3, 0.4],
    ...overrides,
  };
};

test("catalog JSON round-trips and the Gitless loader exposes flat creation dates from its file URL", async (context) =>
{
  const catalog = buildContentCatalog({ sources: {
    "src/ideas/example.md": { created: CREATED_DATE, origin: "git" },
    "src/ideas/new.md": { created: NOW, origin: "prepared" },
  }, records: [createRecord()] });
  const catalogUrl = new URL(`../${CATALOG_PATH}`, import.meta.url);
  // Block Git even through a promisified reference captured before the subprocess mock.
  const originalPath = process.env.PATH;
  process.env.PATH = "";
  context.mock.method(fileSystem, "readFile", async (filePath, encoding) =>
  {
    assert.equal(filePath.href, catalogUrl.href);
    assert.equal(encoding, "utf8");
    return JSON.stringify(catalog);
  });
  context.mock.method(childProcess, "execFile", () => assert.fail("The loader must not execute Git."));
  syncBuiltinESMExports();
  context.after(() =>
  {
    context.mock.restoreAll();
    syncBuiltinESMExports();
    if (originalPath === undefined)
    {
      delete process.env.PATH;
    }
    else
    {
      process.env.PATH = originalPath;
    }
  });

  assert.equal(CATALOG_PATH, "generated/content-metadata.json");
  assert.deepEqual(await readContentCatalog(catalogUrl), catalog);
  assert.deepEqual(await loadDates(), creationDates(catalog));
  assert.deepEqual(creationDates(catalog), { "src/ideas/example.md": CREATED_DATE, "src/ideas/new.md": NOW });
  assert.deepEqual(creationDates(buildContentCatalog()), {});
});

test("build date loading degrades to an empty catalog when the snapshot is missing or invalid", async (context) =>
{
  const warnings = [];
  let invalid = false;
  context.mock.method(console, "warn", (message) => warnings.push(message));
  context.mock.method(fileSystem, "readFile", async () =>
  {
    if (invalid)
    {
      return "invalid JSON";
    }
    const error = new Error("Missing snapshot");
    error.code = "ENOENT";
    throw error;
  });
  syncBuiltinESMExports();
  context.after(() =>
  {
    context.mock.restoreAll();
    syncBuiltinESMExports();
  });

  assert.deepEqual(await loadDates(), {});
  invalid = true;
  assert.deepEqual(await loadDates(), {});
  assert.equal(warnings.length, 2);
  assert.ok(warnings.every((message) => message.includes("build-time date fallbacks")));
});

test("catalog metadata is whitelisted, normalized, sorted, and copied without changing hashes", () =>
{
  const sources = {
    "src/ideas/zebra.md": { created: NOW, origin: "prepared", ignored: true },
    "src/ideas/alpha.md": { created: CREATED_DATE, origin: "git" },
  };
  const records = [
    createRecord({ url: "gemini://example.invalid/example.gmi", inputPath: "././src/gemposts/example.md" }),
    createRecord({ url: "/ideas/zebra/" }),
    createRecord({ url: "/ideas/alpha/", contentDate: new Date(NOW) }),
  ];
  const original = structuredClone({ sources, records });
  const catalog = buildContentCatalog({ sources, records, inputHash: "input-hash", embeddingModel: MODEL });
  const metadata = catalog.records["/ideas/alpha/"];

  assert.deepEqual(Object.keys(catalog.sources), ["src/ideas/alpha.md", "src/ideas/zebra.md"]);
  assert.deepEqual(Object.keys(catalog.records), ["/ideas/alpha/", "/ideas/zebra/", records[0].url]);
  assert.deepEqual(Object.keys(metadata), [
    "inputPath", "title", "kind", "categories", "topics", "contentDate", "description",
    "previewIconName", "wordCount", "textHash", "relationshipHash", "presentationHash",
  ]);
  assert.equal(metadata.contentDate, NOW);
  assert.equal(catalog.records[records[0].url].inputPath, "src/gemposts/example.md");
  assert.equal(catalog.inputHash, "input-hash");
  assert.equal(catalog.embeddingModel, MODEL);
  assert.doesNotMatch(JSON.stringify(catalog), /Private|embeddingText|searchBodyHtml|vector|ignored/);
  assert.deepEqual([metadata.textHash, metadata.relationshipHash, metadata.presentationHash],
    [records[2].textHash, records[2].relationshipHash, records[2].presentationHash]);
  assert.notEqual(catalog.sources["src/ideas/alpha.md"], sources["src/ideas/alpha.md"]);
  assert.deepEqual({ sources, records }, original);
  assert.deepEqual(catalog, buildContentCatalog({ sources: Object.fromEntries(Object.entries(sources).reverse()),
    records: records.toReversed(), inputHash: "input-hash", embeddingModel: MODEL }));
});

test("representative invalid schemas, dates, missing files, and malformed JSON request preparation", async (context) =>
{
  const sourcePath = "src/ideas/example.md";
  const url = "/ideas/example/";
  const valid = buildContentCatalog({ sources: { [sourcePath]: { created: NOW, origin: "prepared" } }, records: [createRecord()] });
  let payload;
  context.mock.method(fileSystem, "readFile", async () =>
  {
    if (payload === undefined)
    {
      throw Object.assign(new Error("Missing file"), { code: "ENOENT" });
    }
    return payload;
  });
  syncBuiltinESMExports();
  context.after(() =>
  {
    context.mock.restoreAll();
    syncBuiltinESMExports();
  });

  await assert.rejects(readContentCatalog(), /Missing content catalog.*npm run content:prepare/);
  payload = "{ invalid JSON }";
  await assert.rejects(readContentCatalog(), /Cannot read content catalog.*npm run content:prepare/);
  const invalid = [
    { ...valid, version: 2 },
    { ...valid, records: [] },
    { ...valid, sources: { [sourcePath]: { created: "2026-02-30T12:00:00Z", origin: "git" } } },
    { ...valid, sources: { [sourcePath]: { created: "2026-10-06", origin: "prepared" } } },
    { ...valid, records: { [url]: { ...valid.records[url], contentDate: "not-a-date" } } },
    { ...valid, records: { [url]: { ...valid.records[url], text: "Private body." } } },
  ];
  for (const catalog of invalid)
  {
    payload = JSON.stringify(catalog);
    await assert.rejects(readContentCatalog(), /Invalid content catalog.*version 1 schema.*npm run content:prepare/);
  }
});

test("creation and presentation dates do not alter embedding or relationship hashes", () =>
{
  const result = {
    inputPath: "./src/ideas/example.md", url: "/ideas/example/",
    rawInput: "---\ntitle: Example idea\n---\n\nOriginal body.", content: "<h1>Example idea</h1>",
    data: { title: "Example idea", contentDate: CREATED_DATE },
  };
  const original = createContentRecord(result, MODEL);
  const changed = createContentRecord({ ...result, data: { ...result.data, contentDate: NOW } }, MODEL);
  const catalog = buildContentCatalog({ sources: { "src/ideas/example.md": { created: NOW, origin: "prepared" } }, records: [changed] });

  assert.equal(changed.embeddingText, original.embeddingText);
  assert.equal(catalog.records[result.url].textHash, original.textHash);
  assert.equal(catalog.records[result.url].relationshipHash, original.relationshipHash);
  assert.notEqual(changed.presentationHash, original.presentationHash);
});

test("catalog building rejects duplicate canonical URLs", () =>
{
  assert.throws(() => buildContentCatalog({ records: [createRecord(), createRecord()] }), /duplicate canonical URL/);
});
