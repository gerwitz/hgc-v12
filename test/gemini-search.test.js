import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { parseHTML } from "linkedom";
import nunjucks from "nunjucks";
import * as pagefind from "pagefind";

import { geminiPostUrl } from "../eleventy/collections/gemlog.js";
import { filterExistingRelated } from "../eleventy/filters/filterexistingrelated.js";
import { createRelatedData, updateRelatedGraph } from "../eleventy/related-graph.js";
import { createSearchDocument } from "../scripts/search-index.js";

const gempost = {
  date: new Date("2026-01-02T12:00:00Z"),
  fileSlug: "capsule-post",
  url: false,
  data: { tags: ["gemposts"], title: "Capsule post" },
};
const destination = geminiPostUrl(gempost);

const content = ["/web/", destination].map((url) =>
{
  return {
    categories: [],
    kind: url === destination ? "gemposts" : "writing",
    relationshipHash: url,
    title: url === destination ? "Capsule post" : "Web post",
    topics: ["gemini"],
    url,
  };
});

const createGraphData = () =>
{
  const embeddings = new Map(content.map((item) => [item.url, Float32Array.from([1, 0])]));
  return createRelatedData(content, updateRelatedGraph(content, embeddings), "test-model");
};

test("related corpus uses canonical Gemini destinations and filters removed or draft posts", () =>
{
  const related = createGraphData();
  assert.equal(destination, "gemini://hans.gerwitz.com/gemlog/2026-01-02-capsule-post.gmi");
  assert.equal(related.sources["/web/"].related[0].url, destination);
  assert.equal(related.sources[destination].related[0].url, "/web/");
  const relationships = [
    ...related.sources["/web/"].related,
    { url: "gemini://hans.gerwitz.com/gemlog/removed.gmi" },
  ];

  assert.deepEqual(filterExistingRelated(relationships, [gempost]), [relationships[0]]);
  assert.deepEqual(filterExistingRelated(relationships, [{ ...gempost, data: { ...gempost.data, draft: true } }]), []);
});

test("related links render the Gemini class without changing ordinary web links", async () =>
{
  const template = await readFile(new URL("../src/_includes/content-meta.njk", import.meta.url), "utf8");
  const environment = new nunjucks.Environment(null, { autoescape: true });
  environment.addFilter("filterExistingRelated", filterExistingRelated);
  environment.addFilter("filterKnownTopics", () => []);
  const related = createGraphData();
  related.sources["/web/"].related.push({ kind: "writing", score: 0.8, title: "Another web post", url: "/another/" });
  const html = environment.renderString(template, {
    page: { url: "/web/" },
    topics: [],
    collections: { all: [gempost, { url: "/another/" }], topics: [] },
    related,
  });
  const { document } = parseHTML(html);
  const geminiLink = document.querySelector("a.gemini-link");

  assert.equal(geminiLink.getAttribute("href"), destination);
  assert.equal(geminiLink.getAttribute("title"), "Gemini-only post");
  assert.equal(geminiLink.textContent, "Capsule post");
  assert.equal(document.querySelector('a[href="/another/"]').hasAttribute("class"), false);
});

test("actual search-result rendering uses the explicit Gemini destination", async () =>
{
  const template = await readFile(new URL("../src/search/index.njk", import.meta.url), "utf8");
  const script = template.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const { document } = parseHTML('<html><body><div class="search-form"><input></div><section id="search-results"><p class="message"></p><div class="results"></div></section></body></html>');
  const context = vm.createContext({ document, window: { location: { search: "" } }, URLSearchParams, console });
  vm.runInContext(`${script}\nglobalThis.renderResults = showResults;`, context);
  context.renderResults([
    { url: "/pagefind-normalized-path/", meta: { destination, title: "Capsule post" } },
    { url: "/web/", meta: { title: "Web post" } },
  ]);
  const links = document.querySelectorAll("#search-results a");

  assert.equal(links[0].getAttribute("href"), destination);
  assert.ok(links[0].classList.contains("gemini-link"));
  assert.equal(links[0].getAttribute("title"), "Gemini-only post");
  assert.equal(links[1].getAttribute("href"), "/web/");
  assert.equal(links[1].classList.contains("gemini-link"), false);
});

test("Pagefind accepts Gemini corpus entries with an explicit destination", async () =>
{
  const record = { ...content[1], previewIconName: "other", searchBodyHtml: "<p>Capsule body searchable text.</p>" };
  const html = createSearchDocument(record, createGraphData(), new Set(content.map((item) => item.url)));
  const { document } = parseHTML(html);
  assert.equal(document.querySelector('meta[name="destination"]').getAttribute("content"), destination);

  const { index, errors } = await pagefind.createIndex({ forceLanguage: "en" });
  assert.ok(!errors?.length);
  try
  {
    const result = await index.addHTMLFile({ url: destination, content: html });
    assert.ok(!result.errors?.length, result.errors?.join("\n"));
  }
  finally
  {
    await index.deleteIndex();
    await pagefind.close();
  }
});
