import assert from "node:assert/strict";
import test from "node:test";

import { createSearchDocument, getNeighborVocabulary } from "../scripts/search-index.js";

const record = {
  categories: [],
  previewIconName: "other",
  searchBodyHtml: "<p>Original body.</p>",
  title: "Example page",
  topics: [],
  url: "/example/",
};

const createRelatedData = (relationships) =>
{
  return { sources: { [record.url]: { related: relationships } } };
};

const createRelationship = (url, overrides = {}) =>
{
  return {
    score: 0.8,
    semanticScore: 0.8,
    sharedTopics: ["shared topic"],
    title: `Title for ${url}`,
    topics: ["neighbor topic"],
    url,
    ...overrides,
  };
};

test("neighbor vocabulary excludes URLs absent from current search records", () =>
{
  const relatedData = createRelatedData([
    createRelationship("/removed/"),
    createRelationship("/lists/"),
    createRelationship("/current/"),
  ]);
  const vocabulary = getNeighborVocabulary(record, relatedData, new Set([record.url, "/current/"]));

  assert.equal(vocabulary, "Title for /current/ shared topic neighbor topic");
  assert.doesNotMatch(vocabulary, /removed|lists/);
});

test("stale relationships do not consume the five eligible neighbor slots", () =>
{
  const urls = Array.from({ length: 6 }, (_, index) => `/current-${index}/`);
  const relatedData = createRelatedData([
    ...Array.from({ length: 5 }, (_, index) => createRelationship(`/removed-${index}/`)),
    ...urls.map((url) => createRelationship(url, { sharedTopics: [], topics: [] })),
  ]);

  assert.equal(
    getNeighborVocabulary(record, relatedData, new Set(urls)),
    urls.slice(0, 5).map((url) => `Title for ${url}`).join(" "),
  );
});

test("current neighbors still require sufficient relationship and semantic confidence", () =>
{
  const relationships = [
    createRelationship("/weak-score/", { score: 0.64 }),
    createRelationship("/weak-semantic/", { semanticScore: 0.64 }),
    createRelationship("/legacy/", { semanticScore: undefined, sharedTopics: [], topics: [] }),
    createRelationship("/threshold/", { score: 0.65, semanticScore: 0.65, sharedTopics: [], topics: [] }),
  ];

  assert.equal(
    getNeighborVocabulary(record, createRelatedData(relationships), new Set(relationships.map((item) => item.url))),
    "Title for /legacy/ Title for /threshold/",
  );
  assert.equal(getNeighborVocabulary(record, { sources: {} }, new Set()), "");
});

test("search documents contain only current neighbor vocabulary and escape it", () =>
{
  const relatedData = createRelatedData([
    createRelationship("/removed/", { title: "Obsolete vocabulary", sharedTopics: [], topics: [] }),
    createRelationship("/current/", { title: 'Current & "quoted"', sharedTopics: [], topics: [] }),
  ]);
  const document = createSearchDocument(record, relatedData, new Set([record.url, "/current/"]));

  assert.match(document, /name="neighbors" content="Current &amp; &quot;quoted&quot;"/);
  assert.doesNotMatch(document, /Obsolete vocabulary/);
  assert.match(document, /<p>Original body\.<\/p>/);
});
