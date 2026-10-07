import assert from "node:assert/strict";
import test from "node:test";

import { createContentRecord } from "../eleventy/content-records.js";
import { createRelatedData, updateRelatedGraph } from "../eleventy/related-graph.js";
import { updateRelatedContent } from "../scripts/related-content.js";

const MODEL = "text-embedding-3-small";
const quietLogger = { log: () => {} };

const createItem = (url, body = "Original body.", data = {}) =>
{
  return createContentRecord({
    content: "<main><h1>Example page</h1></main>",
    data: { contentDate: "2026-09-03", title: "Example page", topics: ["design"], ...data },
    inputPath: "./src/writing/example.md",
    rawInput: `---\ntitle: Example page\n---\n\n${body}`,
    url,
  }, MODEL);
};

const serializeVector = (values) =>
{
  return Buffer.from(Float32Array.from(values).buffer).toString("base64");
};

const createCache = (content, version = 3) =>
{
  return {
    version, model: MODEL,
    embeddings: Object.fromEntries(content.map((item) => [item.textHash, { embedding: serializeVector([1, 0]), model: MODEL }])),
    ...(version === 2 ? { records: Object.fromEntries(content.map((item) => [item.url, { textHash: "stale-url-hash" }])) } : {}),
  };
};

test.beforeEach((context) =>
{
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  context.after(() =>
  {
    if (originalKey === undefined)
    {
      delete process.env.OPENAI_API_KEY;
    }
    else
    {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });
});

test("v2 to v3 migration reuses base64 vectors, removes URL records, and does not mutate previous caches", async () =>
{
  const content = [createItem("/first/"), createItem("/second/", "Second body.")];
  const originalCache = createCache(content, 2);
  const embeddings = new Map(content.map((item) => [item.url, Float32Array.from([1, 0])]));
  const originalGraph = updateRelatedGraph(content, embeddings);
  const untouched = structuredClone({ originalCache, originalGraph });
  const result = await updateRelatedContent({
    content, originalCache, originalGraph, model: MODEL, logger: quietLogger,
    requestEmbeddings: () => assert.fail("Cached text must not be embedded again."),
  });

  assert.deepEqual(Object.keys(result).sort(), ["cache", "graph", "related"]);
  assert.deepEqual(result.cache, createCache(content));
  assert.deepEqual(Object.keys(result.cache).sort(), ["embeddings", "model", "version"]);
  assert.deepEqual(result.graph, updateRelatedGraph(content, embeddings, originalGraph));
  assert.deepEqual(result.related, createRelatedData(content, result.graph, MODEL));
  assert.deepEqual({ originalCache, originalGraph }, untouched);
});

test("dates-only changes preserve hashes, cached vectors, and the graph without an API call", async () =>
{
  const original = createItem("/first/");
  const changed = createItem("/first/", "Original body.", { contentDate: "2001-02-03" });
  const originalCache = createCache([original]);
  const originalGraph = updateRelatedGraph([original], new Map([[original.url, Float32Array.from([1, 0])]]));
  const result = await updateRelatedContent({
    content: [changed], originalCache, originalGraph, model: MODEL, logger: quietLogger,
    requestEmbeddings: () => assert.fail("Dates must not trigger embedding requests."),
  });

  assert.equal(changed.textHash, original.textHash);
  assert.equal(changed.relationshipHash, original.relationshipHash);
  assert.notEqual(changed.presentationHash, original.presentationHash);
  assert.deepEqual(result.cache, originalCache);
  assert.deepEqual(result.graph, originalGraph);
});

test("missing text is deduplicated into batches of 64, cached for reuse, and pruned without mutating the old cache", async () =>
{
  const cached = createItem("/cached/");
  const missing = Array.from({ length: 130 }, (_, index) => createItem(`/page-${index}/`, `Body ${index}.`));
  const content = [cached, ...missing, createItem("/duplicate/", "Body 0.")];
  const originalCache = createCache([cached]);
  originalCache.embeddings.orphan = { embedding: serializeVector([0, 1]), model: MODEL };
  const untouched = structuredClone(originalCache);
  const batches = [];
  const first = await updateRelatedContent({
    content, originalCache, model: MODEL, logger: quietLogger,
    requestEmbeddings: async (items, model) =>
    {
      assert.equal(process.env.OPENAI_API_KEY, undefined);
      assert.equal(model, MODEL);
      batches.push(items.map((item) => item.textHash));
      return items.map(() => [0.8, 0.2]);
    },
  });
  const second = await updateRelatedContent({
    content, originalCache: first.cache, originalGraph: first.graph, model: MODEL, logger: quietLogger,
    requestEmbeddings: () => assert.fail("Updated vectors must be reused."),
  });

  assert.deepEqual(batches.map((batch) => batch.length), [64, 64, 2]);
  assert.deepEqual(batches.flat().sort(), missing.map((item) => item.textHash).sort());
  assert.equal(Object.keys(first.cache.embeddings).length, 131);
  assert.equal(first.cache.embeddings[cached.textHash].embedding, originalCache.embeddings[cached.textHash].embedding);
  assert.equal(first.cache.embeddings.orphan, undefined);
  assert.deepEqual(second.cache, first.cache);
  assert.deepEqual(originalCache, untouched);
});

test("the real provider requires an API key only for missing vectors", async (context) =>
{
  context.mock.method(globalThis, "fetch", () => assert.fail("No network request should be made."));
  const content = [createItem("/first/")];
  const result = await updateRelatedContent({ content, originalCache: createCache(content, 2), model: MODEL, logger: quietLogger });

  assert.equal(result.cache.version, 3);
  await assert.rejects(updateRelatedContent({ content, model: MODEL, logger: quietLogger }), /OPENAI_API_KEY is required/);
});

test("the real provider sends headers and model, bounds its timeout, and sorts returned vectors", async (context) =>
{
  process.env.OPENAI_API_KEY = "test-key-not-a-secret";
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  context.mock.method(AbortSignal, "timeout", (milliseconds) =>
  {
    assert.ok(milliseconds > 0 && milliseconds <= 120000);
    return timeout(milliseconds);
  });
  const model = "test-embedding-model";
  const content = [createItem("/first/"), createItem("/second/", "Second body.")];
  context.mock.method(globalThis, "fetch", async (url, options) =>
  {
    assert.equal(url, "https://api.openai.com/v1/embeddings");
    assert.equal(options.method, "POST");
    assert.deepEqual(options.headers, { Authorization: "Bearer test-key-not-a-secret", "Content-Type": "application/json" });
    assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(options.body), { input: content.map((item) => item.embeddingText), model });
    return { ok: true, json: async () => ({ data: [{ index: 1, embedding: [0.8, 0.2] }, { index: 0, embedding: [1, 0] }] }) };
  });
  const result = await updateRelatedContent({ content, model, logger: quietLogger });

  assert.equal(result.cache.model, model);
  assert.equal(result.cache.embeddings[content[0].textHash].embedding, serializeVector([1, 0]));
  assert.equal(result.cache.embeddings[content[1].textHash].embedding, serializeVector([0.8, 0.2]));
  assert.equal(globalThis.fetch.mock.callCount(), 1);
  assert.equal(AbortSignal.timeout.mock.callCount(), 1);
});
