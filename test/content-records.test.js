import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import contentRecordsPlugin, {
  createContentRecord,
  createContentRecords,
  getContentMetadata,
  readBuiltContentRecords,
} from "../eleventy/content-records.js";

const MODEL = "text-embedding-3-small";

const createResult = (overrides = {}) => {
  return {
    content: "<main><h1>Example page</h1><p>Original body.</p></main>",
    data: {
      contentDate: "2026-09-03",
      tags: ["writing", "searchable"],
      topics: ["Design", "Interfaces"],
    },
    inputPath: "./src/writing/example.md",
    rawInput: "---\ntitle: Example page\n---\n\nOriginal body.",
    url: "/writing/example/",
    ...overrides,
  };
};

test("topic changes preserve the embedding hash", () => {
  const original = createContentRecord(createResult(), MODEL);
  const changed = createContentRecord(createResult({
    data: {
      ...createResult().data,
      topics: ["Design", "Search"],
    },
  }), MODEL);

  assert.equal(changed.textHash, original.textHash);
  assert.notEqual(changed.relationshipHash, original.relationshipHash);
});

test("presentation changes preserve embedding and relationship hashes", () => {
  const original = createContentRecord(createResult(), MODEL);
  const moved = createContentRecord(createResult({
    url: "/writing/moved-example/",
  }), MODEL);

  assert.equal(moved.textHash, original.textHash);
  assert.equal(moved.relationshipHash, original.relationshipHash);
  assert.notEqual(moved.presentationHash, original.presentationHash);
});

test("body changes invalidate embedding and relationship hashes", () => {
  const original = createContentRecord(createResult(), MODEL);
  const changed = createContentRecord(createResult({
    rawInput: "---\ntitle: Example page\n---\n\nChanged body.",
  }), MODEL);

  assert.notEqual(changed.textHash, original.textHash);
  assert.notEqual(changed.relationshipHash, original.relationshipHash);
});

test("topics are normalized for stable relationships", () => {
  const record = createContentRecord(createResult({
    data: {
      ...createResult().data,
      topics: [" Interfaces ", "design", "Design"],
    },
  }), MODEL);

  assert.deepEqual(record.topics, ["design", "interfaces"]);
});

test("Markdown search bodies contain rendered labels rather than Markdown URLs", () => {
  const record = createContentRecord(createResult({
    rawInput: "---\ntitle: Example page\n---\n\nRead [the label](https://example.com/private-path). ![A photograph](/media/private-name.jpg)",
  }), MODEL);

  assert.match(record.searchBodyHtml, /<a href="https:\/\/example\.com\/private-path"/);
  assert.match(record.searchBodyHtml, />the label<\/a>/);
  assert.match(record.searchBodyHtml, /<img src="\/media\/private-name\.jpg" alt="A photograph"/);
  assert.doesNotMatch(record.searchBodyHtml, /\[the label\]/);
});

test("non-Markdown records provide metadata without a search body", () => {
  const record = createContentRecord(createResult({
    data: {
      ...createResult().data,
      description: "Dining experiences",
    },
    inputPath: "./src/logs/dining/index.njk",
    rawInput: "{% for privateItem in privateCollection %}{{ privateItem.secret }}{% endfor %}",
    url: "/logs/dining/",
  }), MODEL);

  assert.equal(record.description, "Dining experiences");
  assert.equal(record.searchBodyHtml, "");
});

test("generated week pages use their source Markdown fragment", () => {
  const record = createContentRecord(createResult({
    data: {
      searchBodyHtml: "<p>A rendered week note.</p>",
      title: "Week 2700",
      topics: ["weeknotes"],
    },
    inputPath: "./src/weeks/page.njk",
    rawInput: "{{ week.content | safe }}",
    url: "/weeks/2700/",
  }), MODEL);

  assert.equal(record.title, "Week 2700");
  assert.equal(record.searchBodyHtml, "<p>A rendered week note.</p>");
  assert.match(record.embeddingText, /A rendered week note\./);
  assert.doesNotMatch(record.embeddingText, /week\.content/);
});

const createCollections = () =>
{
  const item = {
    ...createResult(),
    data: { ...createResult().data, title: "Example page" },
  };
  const listsIndex = {
    ...createResult({ inputPath: "./src/lists/index.md", url: "/lists/" }),
    data: { tags: ["lists"], title: "Lists" },
  };

  return { all: [item, listsIndex], searchable: [item] };
};

test("the canonical metadata manifest excludes the unsearchable lists index", () =>
{
  const collections = createCollections();
  const metadata = getContentMetadata(collections);
  const records = createContentRecords(collections.all, metadata, MODEL);

  assert.deepEqual(records.map((record) => record.url), ["/writing/example/"]);
});

test("record selection preserves metadata-only pages and excludes unlisted paginated pages", () =>
{
  const collections = createCollections();
  const result = createResult({
    content: "<html><h1>Dining</h1></html>",
    data: undefined,
    inputPath: "./src/logs/dining/index.njk",
    rawInput: "---\nsubtitle: Dining experiences\n---\nTemplate",
    url: "/logs/dining/",
  });
  const generated = createResult({
    ...result,
    inputPath: "./src/weeks/page.njk",
    url: "/weeks/1/",
  });
  const records = createContentRecords([
    ...collections.all,
    result,
    generated,
    { ...generated, url: "/weeks/2/" },
    { ...result, inputPath: "./src/search/index.njk", url: "/search/" },
  ], getContentMetadata(collections), MODEL);

  assert.deepEqual(records.map((record) => record.url), ["/writing/example/", "/logs/dining/"]);
  assert.equal(records[1].description, "Dining experiences");
  assert.equal(records[1].searchBodyHtml, "");
});

test("build capture reads resolved metadata and round-trips canonical records privately", async (context) =>
{
  const directory = await mkdtemp(path.join(os.tmpdir(), "hgc-records-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, "content-records.json");
  const events = new Map();
  const collections = createCollections();
  let captureCollection;

  contentRecordsPlugin({
    addCollection: (name, callback) => { captureCollection = callback; },
    on: (name, callback) => events.set(name, callback),
  }, { filePath });
  captureCollection({
    getAll: () => collections.all,
    getFilteredByTag: () => collections.searchable,
  });
  // Computed metadata may resolve after Eleventy constructs collections.
  collections.searchable[0].data.description = "Resolved description";
  await events.get("eleventy.before")({ outputMode: "fs" });
  await events.get("eleventy.after")({
    outputMode: "fs",
    incremental: false,
    results: collections.all,
  });

  assert.deepEqual(await readBuiltContentRecords(filePath), JSON.parse(JSON.stringify(
    createContentRecords(collections.all, getContentMetadata(collections), process.env.OPENAI_EMBEDDING_MODEL || MODEL),
  )));
  assert.equal((await readBuiltContentRecords(filePath))[0].description, "Resolved description");

  // Standalone toJSON extraction must neither overwrite nor invalidate a full build.
  const previous = await readFile(filePath, "utf8");
  await events.get("eleventy.before")({ outputMode: "json" });
  await events.get("eleventy.after")({ outputMode: "json" });
  assert.equal(await readFile(filePath, "utf8"), previous);

  // Failed builds and incremental builds cannot reuse an older, complete artifact.
  await events.get("eleventy.before")({ outputMode: "fs" });
  await assert.rejects(readBuiltContentRecords(filePath), /Run a full Eleventy build/);
  await events.get("eleventy.after")({ outputMode: "fs", incremental: true });
  await assert.rejects(readBuiltContentRecords(filePath), /Run a full Eleventy build/);
});

test("Gemini-only posts retain distinct URLs and bodies in both extraction paths", () =>
{
  const collections = createCollections();
  const gempost = (slug, draft = false) =>
  {
    return {
      inputPath: `./src/gemposts/2026-01-02-${slug}.md`,
      fileSlug: slug,
      date: new Date("2026-01-02T12:00:00Z"),
      url: false,
      page: { rawInput: `---\ntitle: ${slug}\n---\n\nBody for ${slug}.` },
      data: { title: slug, tags: ["gemposts"], topics: ["Gemini"], draft },
    };
  };
  const first = gempost("first");
  const second = gempost("second");
  collections.all.push(first, second, gempost("draft", true));
  const metadata = getContentMetadata(collections);
  const builtRecords = createContentRecords([], metadata, MODEL);
  const jsonRecords = createContentRecords([first, second].map((item) =>
  {
    return { inputPath: item.inputPath, rawInput: item.page.rawInput, url: false, content: "unused rendered HTML" };
  }), metadata, MODEL);

  assert.deepEqual(jsonRecords, builtRecords);
  assert.deepEqual(builtRecords.map((item) => item.url), [
    "gemini://hans.gerwitz.com/gemlog/2026-01-02-first.gmi",
    "gemini://hans.gerwitz.com/gemlog/2026-01-02-second.gmi",
  ]);
  assert.ok(builtRecords.every((item) => item.kind === "gemposts"));
  assert.match(builtRecords[0].searchBodyHtml, /Body for first/);
  assert.match(builtRecords[1].embeddingText, /Body for second/);
  assert.deepEqual(builtRecords[0].topics, ["gemini"]);
  assert.notEqual(builtRecords[0].textHash, builtRecords[1].textHash);
});

test("unsupported build artifacts request a fresh full build", async (context) =>
{
  const directory = await mkdtemp(path.join(os.tmpdir(), "hgc-records-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, "content-records.json");
  await writeFile(filePath, JSON.stringify({ version: 0, records: [] }));

  await assert.rejects(readBuiltContentRecords(filePath), /Run a full Eleventy build to refresh/);
});
