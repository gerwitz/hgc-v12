import assert from "node:assert/strict";
import test from "node:test";

import { createRelatedData, updateRelatedGraph } from "../eleventy/related-graph.js";

const createItem = (url, topics, relationshipHash = url) => {
  return {
    categories: [],
    kind: "writing",
    relationshipHash,
    title: url,
    topics,
    url,
  };
};

const createEmbeddings = (entries) => {
  return new Map(entries.map(([url, embedding]) => [url, Float32Array.from(embedding)]));
};

test("explicit topic overlap increases a semantic relationship score", () => {
  const content = [
    createItem("/first/", ["design"]),
    createItem("/shared/", ["design"]),
    createItem("/unshared/", ["music"]),
  ];
  const embeddings = createEmbeddings([
    ["/first/", [1, 0]],
    ["/shared/", [0.8, 0.6]],
    ["/unshared/", [0.8, 0.6]],
  ]);
  const graph = updateRelatedGraph(content, embeddings);
  const shared = graph.records["/first/"].candidates.find((candidate) => candidate.url === "/shared/");
  const unshared = graph.records["/first/"].candidates.find((candidate) => candidate.url === "/unshared/");

  assert.equal(shared.semanticScore, unshared.semanticScore);
  assert.ok(shared.topicScore > 0);
  assert.ok(shared.score > unshared.score);
});

test("adding content preserves a populated candidate reserve while evaluating the addition", () => {
  const originalContent = Array.from({ length: 10 }, (_, index) => {
    return createItem(`/page-${index}/`, []);
  });
  const originalEmbeddings = createEmbeddings(originalContent.map((item, index) => {
    return [item.url, [1, index / 20]];
  }));
  const originalGraph = updateRelatedGraph(originalContent, originalEmbeddings);
  const retainedUrl = originalGraph.records["/page-0/"].candidates[0].url;
  originalGraph.records["/page-0/"].candidates[0].semanticScore = 0.765432;

  const addedItem = createItem("/added/", []);
  const addedContent = [...originalContent, addedItem];
  const addedEmbeddings = createEmbeddings([
    ...originalEmbeddings,
    [addedItem.url, [0, 1]],
  ]);
  const updatedGraph = updateRelatedGraph(addedContent, addedEmbeddings, originalGraph);
  const retained = updatedGraph.records["/page-0/"].candidates.find((candidate) => candidate.url === retainedUrl);
  const added = updatedGraph.records["/page-0/"].candidates.find((candidate) => candidate.url === addedItem.url);

  assert.equal(retained.semanticScore, 0.765432);
  assert.ok(added);
});

test("related output requires reciprocal selection and exposes score components", () => {
  const content = [
    createItem("/first/", ["design"]),
    createItem("/second/", ["design"]),
  ];
  const embeddings = createEmbeddings([
    ["/first/", [1, 0]],
    ["/second/", [0.9, 0.1]],
  ]);
  const graph = updateRelatedGraph(content, embeddings);
  const related = createRelatedData(content, graph, "test-model");
  const relationship = related.sources["/first/"].related[0];

  assert.equal(relationship.url, "/second/");
  assert.deepEqual(relationship.sharedTopics, ["design"]);
  assert.equal(typeof relationship.semanticScore, "number");
  assert.equal(typeof relationship.topicScore, "number");
});
