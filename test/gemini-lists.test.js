import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import nunjucks from "nunjucks";

import { geminiPath } from "../eleventy/gemtext.js";

const pages = [
  { url: "/lists/bozos/", data: { title: "Cretins" }, page: {} },
  { url: "/lists/brands/", data: { title: "Stickers" }, page: {} },
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
  environment.addFilter("gemtext", () => "Body.\n");

  return environment.renderString(template, { collections: { lists: pages }, entry });
};

test("lists index links to top-level pages, not their descendants", () => {
  const index = render("index.njk");

  assert.match(index, /=> \/lists\/brands\/index\.gmi Stickers/);
  assert.match(index, /=> \/lists\/things\/index\.gmi Things/);
  assert.doesNotMatch(index, /=> \/lists\/brands\/lego\/index\.gmi/);
  assert.doesNotMatch(index, /=> \/lists\/things\/aethos\/index\.gmi/);
  assert.doesNotMatch(index, /\n{3,}/);
  assert.match(index, /\n\n=> \/index\.gmi Capsule home\n$/);
});

test("list pages link to their direct children only", () => {
  const brands = render("content.njk", pages[1]);

  assert.match(brands, /=> \/lists\/brands\/lego\/index\.gmi lego/);
  assert.doesNotMatch(brands, /=> \/lists\/things\/aethos\/index\.gmi/);
  assert.doesNotMatch(brands, /\n{3,}/);
  assert.match(brands, /Body\.\n\n=> \/lists\/brands\/lego\/index\.gmi lego\n/);
});
