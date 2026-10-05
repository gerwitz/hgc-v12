import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import nunjucks from "nunjucks";

import { geminiPath, markdownToGemtext } from "../eleventy/gemtext.js";

const pages = [
  {
    url: "/lists/",
    data: { title: "Lists" },
    page: { rawInput: readFileSync(new URL("../src/lists/index.md", import.meta.url), "utf8") },
  },
  { url: "/lists/bozos/", data: { title: "Cretins" }, page: {} },
  { url: "/lists/brands/", data: { title: "Stickers" }, page: { rawInput: "Body." } },
  { url: "/lists/brands/lego/", data: {}, page: { fileSlug: "lego", rawInput: "" } },
  { url: "/lists/things/", data: { title: "Things" }, page: {} },
  { url: "/lists/things/aethos/", data: { title: "Aethos" }, page: {} },
];

const render = (filename, entry) => {
  const template = readFileSync(new URL(`../src/_editions/gemini/lists/${filename}`, import.meta.url), "utf8")
    .replace(/^---\n[\s\S]*?\n---\n/, "");
  const environment = new nunjucks.Environment();
  environment.addFilter("geminiPath", geminiPath);
  environment.addFilter("plaintext", (value) => value);
  environment.addFilter("gemtext", markdownToGemtext);

  const content = environment.renderString(template, {
    collections: { lists: pages },
    gemini: { routes: ["/lists/"], collections: ["lists"] },
    entry,
  });
  const layout = readFileSync(new URL("../src/_layouts/gemini.njk", import.meta.url), "utf8");

  return environment.renderString(layout, {
    content,
    entry,
    gemini: { webOrigin: "https://hans.gerwitz.com" },
  });
};

test("lists index reuses the web introduction and its selected links", () => {
  const index = render("content.njk", pages[0]);

  assert.match(index, /We like lists because we don’t want to die\./);
  assert.match(index, /=> \/lists\/brands\/index\.gmi Stickers/);
  assert.match(index, /=> \/lists\/things\/index\.gmi Stuff/);
  assert.doesNotMatch(index, /=> \/lists\/bozos\/index\.gmi/);
  assert.doesNotMatch(index, /=> \/lists\/brands\/lego\/index\.gmi/);
  assert.doesNotMatch(index, /\* Stickers/);
  assert.doesNotMatch(index, /=> \/lists\/index\.gmi More lists/);
  assert.doesNotMatch(index, /\n{3,}/);
  assert.match(index, /\n\n# Elsewhere\n=> \/ +Capsule home\n=> \/gemlog +Gemlog\n=> https:\/\/hans\.gerwitz\.com\/lists\/ View on the web\n$/);
  assert.equal(index.split("Capsule home").length - 1, 1);
});

test("list pages link to their direct children only", () => {
  const brands = render("content.njk", pages[2]);

  assert.match(brands, /=> \/lists\/brands\/lego\/index\.gmi lego/);
  assert.doesNotMatch(brands, /=> \/lists\/things\/aethos\/index\.gmi/);
  assert.doesNotMatch(brands, /\n{3,}/);
  assert.match(brands, /Body\.\n\n=> \/lists\/brands\/lego\/index\.gmi lego\n/);
  assert.match(brands, /\n\n# Elsewhere\n=> \/ +Capsule home\n=> \/gemlog +Gemlog\n=> https:\/\/hans\.gerwitz\.com\/lists\/brands\/ View on the web\n$/);
  assert.equal(brands.split("Capsule home").length - 1, 1);
});
