import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import Eleventy from "@11ty/eleventy";
import nunjucks from "nunjucks";


test("the layout suppresses the Gemlog link only on the Gemlog index", async () =>
{
  const layout = await readFile(new URL("../src/_layouts/gemini.njk", import.meta.url), "utf8");
  const environment = new nunjucks.Environment();
  const render = (url) => environment.renderString(layout, {
    content: "# Body",
    page: { url },
  });

  const index = render("/editions/gemini/gemlog/index.gmi");
  assert.doesNotMatch(index, /^=> \/gemlog\s+Gemlog$/m);
  assert.match(index, /^=> \/\s+Capsule home$/m);

  for (const url of [
    "/editions/gemini/gemlog/archive/index.gmi",
    "/editions/gemini/gemlog/2026-10-04-first-post.gmi",
    "/editions/gemini/capsule/index.gmi",
  ])
  {
    assert.match(render(url), /^=> \/gemlog\s+Gemlog$/m);
  }
});


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
    copy("_editions/gemini/capsule/index.gmi"),
    save("_editions/gemini/nested/index.gmi", "# Nested index\n"),
    save("_editions/gemini/nested/page.gmi", "# Nested page\n"),
    save("_editions/gemini/override.gmi", "---\npermalink: /editions/gemini/custom.gmi\n---\n# Explicit override\n"),
    copy("_editions/gemini/index.njk"),
    copy("_editions/gemini/favicon.njk"),
    save("_editions/gemini/probe.gmi", `---
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


  await context.test("the homepage opts out without losing its own navigation", async () => {
    const homepage = await read("index.gmi");
    const source = await readFile(new URL("../src/_editions/gemini/index.njk", import.meta.url), "utf8");
    assert.equal(homepage, source.replace(/^---\n[\s\S]*?\n---\n/, ""));
    assert.match(homepage, /# Hans Gerwitz's capsule/);
    assert.match(homepage, /=> \/capsule\/ \/capsule - About this capsule/);

    assert.doesNotMatch(homepage, /Capsule home/);
  });

  await context.test("favicon and actual redirects remain machine-readable without the footer", async () => {
    const favicon = await read("favicon.txt");
    assert.equal(favicon, "🌲\n");
    const redirects = await read("redirects.json");
    assert.deepEqual(JSON.parse(redirects), {
      "/writing": "/gemlog/archive/",
      "/writing/": "/gemlog/archive/",
      "/writing/index.gmi": "/gemlog/archive/",
      "/posts": "/gemlog/archive/",
      "/posts/": "/gemlog/archive/",
      "/posts/index.gmi": "/gemlog/archive/",
    });

  });
});
