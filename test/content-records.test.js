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
