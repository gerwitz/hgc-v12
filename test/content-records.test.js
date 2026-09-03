import assert from "node:assert/strict";
import test from "node:test";

import { createContentRecord } from "../eleventy/content-records.js";

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
