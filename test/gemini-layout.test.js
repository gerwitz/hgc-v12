import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import Eleventy from "@11ty/eleventy";

const FOOTER = "=> / Capsule home\n=> /capsule/ About this capsule\n";
const assertFooter = (output) => {
  assert.ok(output.endsWith(`\n\n${FOOTER}`));
  assert.equal(output.split(FOOTER).length - 1, 1);
  assert.doesNotMatch(output, /=> \/index\.gmi Capsule home/);
};

test("Gemini sources inherit the shared layout while homepage and machine outputs opt out", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "hgc-gemini-layout-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const input = path.join(directory, "src");
  const output = path.join(directory, "output");
  const save = async (filename, body) => {
    const destination = path.join(input, filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, body);
  };
  const copy = async (filename) => {
    const destination = path.join(input, filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(new URL(`../src/${filename}`, import.meta.url), destination);
  };
  const read = (filename) => readFile(path.join(output, "editions/gemini", filename), "utf8");

  await writeFile(path.join(directory, "package.json"), '{"type":"module"}\n');
  await Promise.all([
    copy("_layouts/gemini.njk"),
    copy("_editions/gemini/gemini.11tydata.js"),
    copy("_editions/gemini/capsule/gemtext.gmi"),
    copy("_editions/gemini/index.njk"),
    copy("_editions/gemini/favicon.njk"),
    save("_editions/gemini/probe.gmi", `---
permalink: /editions/gemini/probe.gmi
title: Nunjucks probe
---
# {{ title }}

{% if gemini.webOrigin %}=> {{ gemini.webOrigin }} Website{% endif %}
`),
  ]);

  // Keep the production redirect template's relative imports intact.
  const redirectsModule = new URL("../src/_editions/gemini/redirects.11ty.js", import.meta.url).href;
  await save("_editions/gemini/redirects.11ty.js", `export { default } from ${JSON.stringify(redirectsModule)};\n`);

  let collectedPages;
  const eleventy = new Eleventy(input, output, {
    configPath: false,
    config: (configuration) => {
      configuration.setQuietMode(true);
      configuration.addExtension("gmi", { key: "njk" });
      configuration.setTemplateFormats(["njk", "gmi", "11ty.js"]);
      configuration.setLayoutsDirectory("_layouts");
      configuration.addCollection("gemlog", (collection) =>
      {
        collectedPages = collection.getAll();
        return [];
      });
    },
  });

  await eleventy.write();

  await context.test("directory data excludes all Gemini templates from collections", () =>
  {
    assert.deepEqual(collectedPages, []);
  });

  await context.test("the gmi alias parses frontmatter and renders Nunjucks before the layout", async () => {
    const probe = await read("probe.gmi");
    assert.equal(probe, `# Nunjucks probe\n\n=> https://hans.gerwitz.com Website\n\n${FOOTER}`);
    assertFooter(probe);
  });

  await context.test("the real Gemtext guide keeps its explicit permalink and plain-text content", async () => {
    const guide = await read("capsule/gemtext/index.gmi");
    const source = await readFile(new URL("../src/_editions/gemini/capsule/gemtext.gmi", import.meta.url), "utf8");
    const body = source.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    assert.equal(guide, `${body}\n\n${FOOTER}`);
    assert.match(guide, /^# From Markdown to Gemtext\n/);
    assert.doesNotMatch(guide, /<h1>|<p>|permalink:|eleventyExcludeFromCollections:/);
    assertFooter(guide);
  });

  await context.test("the homepage opts out without losing its own navigation", async () => {
    const homepage = await read("index.gmi");
    const source = await readFile(new URL("../src/_editions/gemini/index.njk", import.meta.url), "utf8");
    assert.equal(homepage, source.replace(/^---\n[\s\S]*?\n---\n/, ""));
    assert.match(homepage, /# Hans Gerwitz's capsule/);
    assert.match(homepage, /=> \/capsule\/ \/capsule - About this capsule/);
    assert.ok(!homepage.includes(FOOTER));
    assert.doesNotMatch(homepage, /Capsule home/);
  });

  await context.test("favicon and actual redirects remain machine-readable without the footer", async () => {
    const favicon = await read("favicon.txt");
    assert.equal(favicon, "🌲\n");
    const redirects = await read("redirects.json");
    assert.deepEqual(JSON.parse(redirects), {
      "/writing": "/posts/",
      "/writing/": "/posts/",
      "/writing/index.gmi": "/posts/",
    });
    assert.ok(!redirects.includes(FOOTER));
  });
});
