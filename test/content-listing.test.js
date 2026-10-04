import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseHTML } from "linkedom";
import nunjucks from "nunjucks";

import contentData from "../src/site/content.11tydata.js";

const createGempost = (title, date, draft = false) => ({
  date: new Date(date),
  fileSlug: title.toLowerCase(),
  url: false,
  data: { title, tags: ["gemposts"], draft },
});
const writing = {
  fileSlug: "writing",
  url: "/writing/",
  data: { title: "Writing", tags: ["writing"] },
};

const getGroups = (gemposts = []) => contentData.eleventyComputed.contentGroups({
  collections: { searchable: [writing], gemposts },
});

test("content listing includes dated gemposts with canonical URLs but not drafts", () =>
{
  const older = createGempost("Older", "2026-01-01");
  const newer = createGempost("Newer", "2026-01-02");
  const draft = createGempost("Draft", "2026-01-03", true);
  const groups = getGroups([older, newer, draft]);

  assert.deepEqual(groups.map((group) => group.title), ["Gemposts", "Writing"]);
  assert.equal(groups[0].hasDatedItems, true);
  assert.deepEqual(groups[0].items.map((item) => item.url), [
    "gemini://hans.gerwitz.com/posts/2026-01-02-newer.gmi",
    "gemini://hans.gerwitz.com/posts/2026-01-01-older.gmi",
  ]);
  assert.equal(groups[0].items[0].data.contentDate, newer.date);
  assert.equal(groups[1].items[0], writing);
  assert.equal(newer.url, false);
  assert.equal(newer.data.contentDate, undefined);
});

test("content listing works without a gemposts collection", () =>
{
  const groups = contentData.eleventyComputed.contentGroups({ collections: { searchable: [writing] } });
  assert.deepEqual(groups.map((group) => group.title), ["Writing"]);
});

test("content listing renders Gemini links and dates without changing web links", async () =>
{
  const source = await readFile(new URL("../src/site/content.njk", import.meta.url), "utf8");
  const template = source.replace(/^---[\s\S]*?---\s*/, "");
  const environment = new nunjucks.Environment(null, { autoescape: true });
  environment.addFilter("date", (value) => new Date(value).toISOString().slice(0, 10));
  const html = environment.renderString(template, {
    generated: new Date("2026-01-03"),
    contentGroups: getGroups([createGempost("Capsule", "2026-01-02")]),
  });
  const { document } = parseHTML(html);
  const geminiLink = document.querySelector("a.gemini-link");

  assert.equal(geminiLink.getAttribute("href"), "gemini://hans.gerwitz.com/posts/2026-01-02-capsule.gmi");
  assert.equal(geminiLink.getAttribute("title"), "Gemini-only post");
  assert.match(document.querySelector("tbody").textContent, /2026-01-02/);
  assert.equal(document.querySelector('a[href="/writing/"]').hasAttribute("class"), false);
});


test("content listing does not read premature template content", () =>
{
  const gempost = createGempost("Capsule", "2026-01-02");
  Object.defineProperty(gempost, "templateContent", {
    enumerable: true,
    get: () =>
    {
      throw new Error("Tried to use templateContent too early");
    },
  });

  const groups = getGroups([gempost]);
  assert.equal(groups[0].items[0].url, "gemini://hans.gerwitz.com/posts/2026-01-02-capsule.gmi");
});
