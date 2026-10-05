import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import Eleventy from "@11ty/eleventy";

import { confessions } from "../eleventy/collections/confessions.js";
import { content } from "../eleventy/collections/content.js";
import { gemlog } from "../eleventy/collections/gemlog.js";
import { posts } from "../eleventy/collections/posts.js";
import { topicContent } from "../eleventy/collections/topicContent.js";
import contentRecordsPlugin, { readBuiltContentRecords } from "../eleventy/content-records.js";
import { date } from "../eleventy/filters/date.js";
import { plaintext } from "../eleventy/filters/plaintext.js";
import { weeknum } from "../eleventy/filters/weeknum.js";
import { markdownToGemtext } from "../eleventy/gemtext.js";
import markdownPlugin from "../eleventy/markdown.js";

const ENTRY_COUNT = 54;
const DRAFT_SLUG = "fixture-draft";
const DRAFT_TITLE = "Test gempost draft";
const createEntries = () => Array.from({ length: ENTRY_COUNT }, (_, index) => {
  const published = new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10);
  const kind = index % 2 === 0 ? "writing" : "gemposts";
  const slug = `fixture-${String(index).padStart(2, "0")}`;

  return {
    kind,
    slug,
    published,
    title: `Test ${kind} ${index}`,
    filename: `${published}-${slug}.md`,
    geminiUrl: `/posts/${published}-${slug}.gmi`,
    webUrl: `/writing/2026/${slug}/`,
  };
});

const postLinks = (output) => output.split("\n").filter((line) => line.startsWith("=> /posts/2026-"));
const expectedLink = (entry) => `=> ${entry.geminiUrl} ${entry.published} - ${entry.title}`;
const assertFooter = (output) => {
  assert.match(output, /\n\n=> \/ Capsule home\n=> \/capsule\/ About this capsule\n$/);
  assert.equal(output.split("Capsule home").length - 1, 1);
};

const outputFiles = async (directory) => {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true }))
  {
    const filename = path.join(directory, entry.name);

    if (entry.isDirectory())
    {
      files.push(...await outputFiles(filename));
    }
    else
    {
      files.push(filename);
    }
  }

  return files;
};

const createFixture = async (directory, entries) => {
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

  await writeFile(path.join(directory, "package.json"), '{"type":"module"}\n');
  await Promise.all([
    copy("gemposts/gemposts.11tydata.js"),
    copy("writing/writing.11tydata.js"),
    copy("_editions/gemini/gemini.11tydata.js"),
    copy("_layouts/gemini.njk"),
    copy("_editions/gemini/posts/content.njk"),
    copy("_editions/gemini/posts/index.njk"),
    copy("_editions/gemini/gemlog/index.njk"),
    save("_layouts/writing.njk", "<article>{{ content | safe }}</article>\n"),
  ]);

  // Import JavaScript templates in place so their relative production imports still resolve.
  const redirectsModule = new URL("../src/_editions/gemini/redirects.11ty.js", import.meta.url).href;
  const searchModule = new URL("../src/search/records.json.11ty.js", import.meta.url).href;
  await save("_editions/gemini/redirects.11ty.js", `export { default } from ${JSON.stringify(redirectsModule)};\n`);
  await save("search/records.11ty.js", `
import SearchRecords from ${JSON.stringify(searchModule)};
export default class FixtureSearchRecords extends SearchRecords
{
  data()
  {
    return { ...super.data(), permalink: "/fixture-search.json" };
  }
}
`);

  // Observe real collection entries without serializing Eleventy's circular template objects.
  await save("metadata.11ty.js", `
export default class FixtureMetadata
{
  data()
  {
    return { permalink: "/fixture-metadata.json", eleventyExcludeFromCollections: true };
  }

  render(data)
  {
    const names = ["all", "gemlog", "gemposts", "writing", "posts", "content", "topicContent", "searchable", "confessions"];
    return JSON.stringify(Object.fromEntries(names.map((name) => [name,
      (data.collections[name] || []).map((entry) => ({
        url: entry.url,
        geminiUrl: entry.geminiUrl,
        fileSlug: entry.fileSlug,
        date: entry.date,
        title: entry.data.title,
        tags: entry.data.tags,
        layout: entry.data.layout,
        permalink: entry.data.permalink,
        confession: entry.data.confession,
        excludeFromFeed: entry.data.excludeFromFeed,
        description: entry.data.description,
        breadcrumbs: entry.data.breadcrumbs,
        searchBodyHtml: entry.data.searchBodyHtml,
        wordCount: entry.data.wordCount
      }))
    ])));
  }
}
`);

  for (const entry of entries)
  {
    const permalink = entry.kind === "writing" ? `permalink: ${entry.webUrl}\n` : "";
    const confession = entry === entries[0] || entry === entries[1]
      ? `confession: Test confession for ${entry.slug}\n` : "";
    await save(`${entry.kind}/${entry.filename}`, `---
title: ${entry.title}
${permalink}${confession}topics: [fixture-topic]
---

Fixture body for **${entry.slug}**.

[Relative destination](sibling/)
`);
  }

  await save(`gemposts/2026-03-02-${DRAFT_SLUG}.md`, `---
title: ${DRAFT_TITLE}
draft: true
confession: Test draft confession
topics: [fixture-topic]
---

Unpublished ${DRAFT_SLUG} body.
`);

  await save("notes/2026-03-01-unrelated.md", "---\ntitle: Unrelated note\ntags: [notes]\n---\n\nNot a gemlog post.\n");

  const eleventy = new Eleventy(input, output, {
    configPath: false,
    config: (configuration) => {
      configuration.setQuietMode(true);
      configuration.setDataDeepMerge(true);
      configuration.addPlugin(markdownPlugin);
      configuration.addPlugin(contentRecordsPlugin, { filePath: path.join(directory, "content-records.json") });
      configuration.addFilter("date", date);
      configuration.addFilter("plaintext", plaintext);
      configuration.addFilter("weeknum", weeknum);
      configuration.addFilter("gemtext", markdownToGemtext);
      configuration.addFilter("limit", (items, count) => items.slice(0, count));
      configuration.addCollection("gemlog", gemlog);
      configuration.addCollection("confessions", confessions);
      configuration.addCollection("posts", posts);
      configuration.addCollection("content", content);
      configuration.addCollection("topicContent", topicContent);
      configuration.addCollection("topics", (collection) => collection.getFilteredByTag("topics"));

      configuration.setIncludesDirectory("_includes");
      configuration.setLayoutsDirectory("_layouts");
      configuration.setTemplateFormats(["html", "njk", "md", "11ty.js"]);
      configuration.setHtmlTemplateEngine("njk");
      configuration.setMarkdownTemplateEngine("njk");
    },
  });

  await eleventy.write();

  return {
    output,
    read: (filename) => readFile(path.join(output, filename), "utf8"),
    readRecords: () => readBuiltContentRecords(path.join(directory, "content-records.json")),
  };
};

test("gemlog sorts same-date titles and de-duplicates entries with both tags without rendering content", () => {
  const createEntry = (title, tags, published = "2026-01-02") => ({
    data: { title, tags },
    date: new Date(`${published}T12:00:00Z`),
    fileSlug: title.toLowerCase(),
    page: {},
    url: tags.includes("writing") ? `/writing/${title.toLowerCase()}/` : false,
    get templateContent()
    {
      assert.fail("The gemlog collection must not access lazy rendered content");
    },
  });
  const shared = createEntry("Bravo", ["writing", "gemposts"]);
  const entries = [
    createEntry("Zulu", ["writing"]),
    shared,
    createEntry("Alpha", ["gemposts"]),
    createEntry("Earlier", ["gemposts"], "2026-01-01"),
    createEntry("Unrelated", ["notes"]),
  ];
  const collection = {
    getFilteredByTags: (...tags) => entries.filter((entry) => tags.every((tag) => entry.data.tags.includes(tag))),
  };
  const result = gemlog(collection);

  assert.deepEqual(result.map((entry) => entry.data.title), ["Earlier", "Alpha", "Bravo", "Zulu"]);
  assert.equal(result.filter((entry) => entry.data === shared.data).length, 1);
  assert.equal(result[2].page, shared.page);
  assert.equal(result[2].url, shared.url);
  assert.equal(result[2].geminiUrl, "/posts/2026-01-02-bravo.gmi");
});

test("gemposts and writing integrate through the actual Gemini templates and directory data", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "hgc-gemini-posts-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const entries = createEntries();
  const fixture = await createFixture(directory, entries);
  const metadata = JSON.parse(await fixture.read("fixture-metadata.json"));
  const gempost = entries[1];
  const writing = entries[0];

  await context.test("gemlog merges both tag groups once in chronological order", () => {
    assert.deepEqual(metadata.gemlog.map((entry) => entry.title), entries.map((entry) => entry.title));
    assert.deepEqual(metadata.gemlog.map((entry) => entry.geminiUrl), entries.map((entry) => entry.geminiUrl));
    assert.equal(new Set(metadata.gemlog.map((entry) => entry.geminiUrl)).size, ENTRY_COUNT);
    assert.equal(metadata.gemlog.find((entry) => entry.title === writing.title).url, writing.webUrl);
    assert.equal(metadata.gemlog.find((entry) => entry.title === gempost.title).url, false);
  });

  await context.test("a gempost renders at its canonical dated capsule path without a web counterpart", async () => {
    const output = await fixture.read(`editions/gemini${gempost.geminiUrl}`);
    assert.match(output, /^# Test gemposts 1\n/);
    assertFooter(output);
    assert.match(output, /Fixture body for fixture-01\./);
    assert.match(output, /## About this post\n/);
    assert.match(output, /Posted during week \d+ \(January 2026\)\./);
    assert.match(output, /=> \/posts\/ More posts/);
    assert.doesNotMatch(output, /View on the web|<article>|<p>|<strong>|topics:|tags:|permalink:/);

    const files = await outputFiles(fixture.output);
    assert.deepEqual(files.filter((filename) => filename.includes(gempost.slug)), [
      path.join(fixture.output, `editions/gemini${gempost.geminiUrl}`),
    ]);
  });

  await context.test("writing keeps its web permalink and gets a canonical capsule post", async () => {
    const web = await fixture.read(`writing/2026/${writing.slug}/index.html`);
    assert.match(web, /<article>/);
    assert.match(web, /<strong>fixture-00<\/strong>/);

    const output = await fixture.read(`editions/gemini${writing.geminiUrl}`);
    assert.match(output, /^# Test writing 0\n/);
    assertFooter(output);
    assert.match(output, /=> https:\/\/hans\.gerwitz\.com\/writing\/2026\/fixture-00\/ View on the web/);
    assert.match(output, /=> https:\/\/hans\.gerwitz\.com\/writing\/2026\/fixture-00\/sibling\//);
    assert.doesNotMatch(output, /<article>|<strong>/);
  });

  await context.test("the feed includes the newest 50 mixed posts and links to the complete archive", async () => {
    const output = await fixture.read("editions/gemini/gemlog/index.gmi");
    assertFooter(output);
    assert.deepEqual(postLinks(output), entries.slice(-50).reverse().map(expectedLink));
    assert.match(output, /=> \/posts\/ \/posts - all 54 posts/);
    assert.match(output, /=> \/notes\/ \/notes - all 1 untitled notes/);
    assert.doesNotMatch(output, /Unrelated note|=> \/writing\//);
  });

  await context.test("the archive includes every mixed post newest first", async () => {
    const output = await fixture.read("editions/gemini/posts/index.gmi");
    assert.match(output, /^# Posts\n/);
    assertFooter(output);
    assert.deepEqual(postLinks(output), entries.toReversed().map(expectedLink));
    assert.doesNotMatch(output, /Unrelated note|=> \/writing\//);
  });

  await context.test("redirects preserve old writing capsule URLs without redirecting gemposts", async () => {
    const redirects = JSON.parse(await fixture.read("editions/gemini/redirects.json"));
    const expected = {
      "/writing": "/posts/",
      "/writing/": "/posts/",
      "/writing/index.gmi": "/posts/",
    };

    for (const entry of entries.filter((entry) => entry.kind === "writing"))
    {
      expected[`${entry.webUrl}index.gmi`] = entry.geminiUrl;
    }

    assert.deepEqual(redirects, expected);
  });

  await context.test("a draft gempost is absent from collections and Gemini output", async () => {
    for (const [name, items] of Object.entries(metadata))
    {
      assert.ok(items.every((entry) => entry.title !== DRAFT_TITLE && entry.fileSlug !== DRAFT_SLUG), name);
    }

    const files = await outputFiles(fixture.output);
    assert.ok(files.every((filename) => !filename.includes(DRAFT_SLUG)));

    for (const filename of files.filter((filename) => filename.endsWith(".gmi")))
    {
      const output = await readFile(filename, "utf8");
      assert.ok(!output.includes(DRAFT_TITLE), filename);
      assert.ok(!output.includes(DRAFT_SLUG), filename);
    }
  });

  await context.test("a published gempost confession stays out of the web confessions collection", () => {
    const source = metadata.gemposts.find((entry) => entry.title === gempost.title);
    assert.equal(source.confession, `Test confession for ${gempost.slug}`);
    assert.equal(source.excludeFromFeed, true);
    assert.ok(metadata.gemlog.some((entry) => entry.title === gempost.title));
    assert.deepEqual(metadata.confessions.map((entry) => entry.title), [writing.title]);
  });

  await context.test("gemposts join the shared corpus without inheriting writing metadata or web publication", async () => {
    assert.equal(metadata.gemposts.length, ENTRY_COUNT / 2);

    for (const entry of metadata.gemposts)
    {
      assert.equal(entry.url, false);
      assert.equal(entry.permalink, false);
      assert.equal(entry.layout, false);
      assert.deepEqual(entry.tags, ["gemposts"]);
      assert.equal(entry.description, undefined);
      assert.equal(entry.breadcrumbs, undefined);
      assert.equal(entry.searchBodyHtml, undefined);
      assert.equal(entry.wordCount, undefined);
    }

    for (const name of ["posts", "content", "topicContent", "searchable"])
    {
      assert.ok(metadata[name].every((entry) => !entry.tags.includes("gemposts")), name);
    }

    // Positive controls ensure web content and metadata actually exist in the fixture.
    assert.ok(metadata.content.some((entry) => entry.url === writing.webUrl));
    assert.ok(metadata.topicContent.some((entry) => entry.url === writing.webUrl));
    assert.ok(metadata.searchable.some((entry) => entry.url === writing.webUrl));
    const searchRecords = JSON.parse(await fixture.read("fixture-search.json"));
    assert.equal(searchRecords.length, ENTRY_COUNT);
    assert.deepEqual(searchRecords.map((entry) => entry.url).sort(),
      entries.map((entry) => entry.kind === "writing" ? entry.webUrl : `gemini://hans.gerwitz.com${entry.geminiUrl}`).sort());
    assert.ok(searchRecords.every((entry) => entry.title !== DRAFT_TITLE));

    const records = await fixture.readRecords();
    assert.equal(records.length, ENTRY_COUNT);
    const gempostRecord = records.find((entry) => entry.url === `gemini://hans.gerwitz.com${gempost.geminiUrl}`);
    assert.equal(gempostRecord.title, gempost.title);
    assert.match(gempostRecord.searchBodyHtml, /<strong>fixture-01<\/strong>/);
    assert.match(gempostRecord.embeddingText, /Fixture body for/);
    assert.deepEqual(gempostRecord.topics, ["fixture-topic"]);
    assert.ok(records.every((entry) => entry.title !== DRAFT_TITLE));

    const files = await outputFiles(fixture.output);
    assert.ok(files.every((filename) => !path.relative(fixture.output, filename).startsWith(`gemposts${path.sep}`)));
  });
});
