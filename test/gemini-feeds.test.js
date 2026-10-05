import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import nunjucks from "nunjucks";

import { gemlogDsn } from "../eleventy/collections/gemlog.js";
import { date } from "../eleventy/filters/date.js";
import { tinylogDate } from "../eleventy/filters/tinylogdate.js";
import { geminiPath, markdownToGemtext } from "../eleventy/gemtext.js";

const entries = Array.from({ length: 60 }, (_, index) => ({
  url: index === 59 ? false : `/writing/entry-${index}.html`,
  geminiUrl: `/gemlog/2026-01-01-entry-${index}.gmi`,
  date: new Date(Date.UTC(2026, 0, index + 1)),
  data: { title: `Entry ${index}`, tags: [index === 59 ? "gemposts" : "writing"] },
  page: { rawInput: `# Body heading\n\nNote ${index}.\n\n## Another heading\n` },
}));

const renderFeed = (name, collections, configuration = {}) => {
  const template = readFileSync(new URL(`../src/_editions/gemini/${name}/index.njk`, import.meta.url), "utf8")
    .replace(/^---\n[\s\S]*?\n---\n/, "");
  const environment = new nunjucks.Environment();
  environment.addFilter("date", date);
  environment.addFilter("tinylogDate", tinylogDate);
  environment.addFilter("geminiPath", geminiPath);
  environment.addFilter("plaintext", (value) => value);
  environment.addFilter("limit", (items, count) => items.slice(0, count));
  environment.addFilter("gemtext", markdownToGemtext);

  return environment.renderString(template, {
    collections,
    gemini: configuration,
  });
};

test("gemlog lists only the newest 50 merged posts and links to the archive", () => {
  const output = renderFeed("gemlog", { gemlog: entries, notes: entries });
  const links = output.split("\n").filter((line) => line.startsWith("=> /gemlog/2026-01-01-entry-"));

  assert.equal(links.length, 50);
  assert.match(links[0], /entry-59\.gmi/);
  assert.match(links.at(-1), /entry-10\.gmi/);
  assert.match(output, /=> \/gemlog\/archive\/ \/gemlog\/archive - all 60 posts/);
  assert.match(output, /=> \/notes\/ \/notes - all 60 untitled notes/);
});

test("DSN lists the newest 50 non-work posts after filtering both Writing and gemposts", () =>
{
  const sourceEntries = Array.from({ length: 90 }, (_, index) => ({
    ...entries[index % entries.length],
    fileSlug: `entry-${index}`,
    date: new Date(Date.UTC(2026, 0, index + 1)),
    data: {
      title: `Entry ${index}`,
      tags: [index % 2 === 0 ? "writing" : "gemposts"],
      categories: index % 3 === 0 ? ["culture", "work"] : index % 5 === 0 ? undefined : ["personal"],
    },
  }));
  const collection = {
    getFilteredByTags: (tag) => sourceEntries.filter((entry) => entry.data.tags.includes(tag)),
  };
  const filtered = gemlogDsn(collection);
  const output = renderFeed("gemlog/dsn", { gemlogDsn: filtered, gemlog: sourceEntries, notes: [] });
  const links = output.split("\n").filter((line) => /^=> \/gemlog\/\d{4}-/.test(line));

  assert.equal(filtered.length, 60);
  assert.ok(filtered.some((entry) => !entry.data.categories));
  assert.ok(filtered.some((entry) => entry.data.tags.includes("gemposts")));
  assert.equal(links.length, 50);
  assert.deepEqual(links, filtered.slice(-50).reverse().map((entry) =>
    `=> ${entry.geminiUrl} ${date(entry.date, "YYYY-MM-DD")} - ${entry.data.title}`));
  assert.match(links[0], /entry-89\.gmi/);
  assert.match(links.at(-1), /entry-16\.gmi/);
  assert.doesNotMatch(output, / - Entry (?:0|3|87)\n/);
});

test("DSN handles an entirely work-category collection", () =>
{
  const collection = {
    getFilteredByTags: (tag) => tag === "writing"
      ? [{ ...entries[0], fileSlug: "work", data: { title: "Work", categories: ["work"] } }]
      : [],
  };
  const filtered = gemlogDsn(collection);
  const output = renderFeed("gemlog/dsn", { gemlogDsn: filtered, gemlog: [], notes: [] });

  assert.deepEqual(filtered, []);
  assert.doesNotMatch(output, /^=> \/gemlog\/\d{4}-/m);
});

test("tinylog renders the newest 20 notes with valid timestamps and body headings", () => {
  const output = renderFeed("tinylog", { notes: entries }, { minimumHeadingLevel: 3 });
  const headings = output.split("\n").filter((line) => line.startsWith("## ") && line !== "## Archives");

  assert.equal(headings.length, 20);
  assert.ok(headings.every((heading) => /^## \d{4}-\d{2}-\d{2} \d{2}:\d{2} [+-]\d{4}$/.test(heading)));
  assert.equal(output.split("\n").filter((line) => line.startsWith("# ")).length, 1);
  assert.match(output, /### Body heading/);
  assert.match(output, /### Another heading/);
  assert.match(output, /## 2026-03-01 12:00 \+0100/);
  assert.match(output, /Note 59\./);
  assert.match(output, /Note 40\./);
  assert.doesNotMatch(output, /Note 39\./);
  assert.match(output, /\n\n## /);
});
