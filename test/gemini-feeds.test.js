import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import nunjucks from "nunjucks";

import { date } from "../eleventy/filters/date.js";
import { geminiPath, markdownToGemtext } from "../eleventy/gemtext.js";

const entries = Array.from({ length: 60 }, (_, index) => ({
  url: `/writing/entry-${index}.html`,
  date: new Date(Date.UTC(2026, 0, index + 1)),
  data: { title: `Entry ${index}` },
  page: { rawInput: `# Body heading\n\nNote ${index}.\n\n## Another heading\n` },
}));

const renderFeed = (name, collections, configuration = {}) => {
  const template = readFileSync(new URL(`../src/_editions/gemini/${name}/index.njk`, import.meta.url), "utf8")
    .replace(/^---\n[\s\S]*?\n---\n/, "");
  const environment = new nunjucks.Environment();
  environment.addFilter("date", date);
  environment.addFilter("geminiPath", geminiPath);
  environment.addFilter("plaintext", (value) => value);
  environment.addFilter("limit", (items, count) => items.slice(0, count));
  environment.addFilter("gemtext", markdownToGemtext);

  return environment.renderString(template, {
    collections,
    gemini: configuration,
  });
};

test("gemlog lists only the newest 50 writing entries and links to the archive", () => {
  const output = renderFeed("gemlog", { writing: entries, notes: entries });
  const links = output.split("\n").filter((line) => line.startsWith("=> /writing/entry-"));

  assert.equal(links.length, 50);
  assert.match(links[0], /entry-59\.gmi/);
  assert.match(links.at(-1), /entry-10\.gmi/);
  assert.match(output, /=> \/writing\/ All writing\n$/);
});

test("tinylog renders the newest 20 notes with valid timestamps and body headings", () => {
  const output = renderFeed("tinylog", { notes: entries }, { minimumHeadingLevel: 3 });
  const headings = output.split("\n").filter((line) => line.startsWith("## "));

  assert.equal(headings.length, 20);
  assert.ok(headings.every((heading) => /^## \d{4}-\d{2}-\d{2} \d{2}:\d{2} [+-]\d{4}$/.test(heading)));
  assert.equal(output.split("\n").filter((line) => line.startsWith("# ")).length, 1);
  assert.match(output, /### Body heading/);
  assert.match(output, /### Another heading/);
  assert.match(output, /Note 59\./);
  assert.match(output, /Note 40\./);
  assert.doesNotMatch(output, /Note 39\./);
  assert.match(output, /\n\n## /);
});
