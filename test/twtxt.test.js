import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import Eleventy from "@11ty/eleventy";

import { createTwtxtFeeds } from "../eleventy/twtxt.js";
import { twtxtHash } from "../eleventy/twtxt-hash.js";

const FEED_URL = "https://hans.gerwitz.com/twtxt.txt";
const NOW = new Date("2026-10-27T12:00:00Z");
const note = (timestamp, text, data = {}) => ({
  date: new Date("2026-01-01T00:00:00Z"),
  url: `/notes/${timestamp}/`,
  data: { tags: ["notes"], ...data },
  page: { rawInput: `---\ndate: ${timestamp}\n---\n\n${text}\n` },
});
const lines = (feed) => feed.content.split("\n").filter((line) => line && !line.startsWith("#"));

test("the current feed filters and sorts notes, transforms links, and encodes line breaks", () =>
{
  const notes = [
    note("2026-10-01T07:11:00.999+02:00", "First paragraph.\r\n\r\nSecond line.\rThird line.\nLast line."),
    note("2027-01-01", "Next year."),
    note("2026-06-16", "Read [more](https://example.com/Article_(topic)) ![Image](/media/image.jpg) 🌲."),
    note("2026-01-01", "A draft.", { draft: true }),
    note("2026-01-02", "Excluded.", { excludeFromFeed: true }),
    note("2025-12-31T23:45:00-05:00", "An archive entry."),
  ];
  const feeds = createTwtxtFeeds(notes, NOW);

  assert.deepEqual(feeds.map((feed) => feed.path), ["/twtxt.txt", "/twtxt-2025.txt"]);
  assert.deepEqual(lines(feeds[0]), [
    "2026-06-16T12:00:00+02:00\tRead more <https://example.com/Article_(topic)> ![Image](/media/image.jpg) 🌲.",
    "2026-10-01T07:11:00+02:00\tFirst paragraph.\u2028\u2028Second line.\u2028Third line.\u2028Last line.",
  ]);

  assert.equal(lines(feeds[1])[0], "2025-12-31T23:45:00-05:00\tAn archive entry.");
});


test("archives form a prev chain using the main URL and the last entry's hash", () =>
{
  const feeds = createTwtxtFeeds([
    note("2025-01-01T12:00:00Z", "Earlier."),
    note("2023-08-01T12:00:00Z", "Oldest archive."),
    note("2026-01-01T12:00:00Z", "Current."),
    note("2025-12-31T12:00:00Z", "Last [source](https://example.com/)\narchived note."),
  ], NOW);

  assert.deepEqual(feeds.map((feed) => feed.path), ["/twtxt.txt", "/twtxt-2025.txt", "/twtxt-2023.txt"]);
  assert.ok(feeds[0].content.includes(`# prev = ${twtxtHash(FEED_URL, "2025-12-31T12:00:00Z", "Last source <https://example.com/>\u2028archived note.")} twtxt-2025.txt\n`));
  assert.ok(feeds[1].content.includes(`# prev = ${twtxtHash(FEED_URL, "2023-08-01T12:00:00Z", "Oldest archive.")} twtxt-2023.txt\n`));
  assert.ok(!feeds[2].content.includes("# prev ="));

  for (const feed of feeds)
  {
    assert.ok(feed.content.includes(`# url = ${FEED_URL}\n`));
  }

  assert.deepEqual(lines(feeds[1]), [
    "2025-01-01T12:00:00Z\tEarlier.",
    "2025-12-31T12:00:00Z\tLast source <https://example.com/>\u2028archived note.",
  ]);

});

test("a new Amsterdam calendar year rolls the previous feed into an archive without changing posts", () =>
{
  const notes = [note("2026-07-01T00:00:00Z", "Hello World!")];
  const current = createTwtxtFeeds(notes, NOW);
  const nextYear = createTwtxtFeeds(notes, new Date("2026-12-31T23:30:00Z"));

  assert.deepEqual(nextYear.map((feed) => feed.path), ["/twtxt.txt", "/twtxt-2026.txt"]);
  assert.deepEqual(lines(nextYear[0]), []);
  assert.deepEqual(lines(nextYear[1]), lines(current[0]));
  assert.ok(nextYear[0].content.includes(`# prev = ${twtxtHash(FEED_URL, "2026-07-01T00:00:00Z", "Hello World!")} twtxt-2026.txt`));
});


test("Eleventy generates twtxt and yearly archives from notes without creating collection entries", async (context) =>
{
  const directory = await mkdtemp(path.join(tmpdir(), "hgc-twtxt-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const input = path.join(directory, "src");
  const output = path.join(directory, "output");
  await mkdir(input, { recursive: true });
  const template = new URL("../src/twtxt.11ty.js", import.meta.url).href;
  await writeFile(path.join(input, "twtxt.11ty.js"), `export { default } from ${JSON.stringify(template)};\n`);

  for (const [filename, frontMatter, text] of [
    ["2026-10-01-current.md", "tags: [notes]\ndate: 2026-10-01T07:11:00.000+02:00", "First paragraph.\n\nSecond paragraph."],
    ["2025-06-16-previous.md", "tags: [notes]\ndate: 2025-06-16", "Archived note."],

    ["2026-01-02-writing.md", "tags: [writing]\ndate: 2026-01-02", "Not a note."],
  ])
  {
    await writeFile(path.join(input, filename), `---\n${frontMatter}\n---\n\n${text}\n`);
  }

  const eleventy = new Eleventy(input, output, {
    configPath: false,
    config: (configuration) =>
    {
      configuration.setQuietMode(true);
      configuration.addGlobalData("generated", NOW);
      configuration.addCollection("observed", (collection) =>
      {
        assert.ok(collection.getAll().every((entry) => !entry.inputPath.endsWith("/twtxt.11ty.js")));
        return [];
      });
      configuration.setTemplateFormats(["md", "11ty.js"]);
    },
  });
  const results = await eleventy.toJSON();
  const generated = results.filter((result) => /^\/twtxt(?:-\d{4})?\.txt$/.test(result.url));
  assert.deepEqual(generated.map((result) => result.url).sort(), ["/twtxt-2025.txt", "/twtxt.txt"]);
  const current = generated.find((result) => result.url === "/twtxt.txt").content;
  assert.ok(current.includes("2026-10-01T07:11:00+02:00\tFirst paragraph.\u2028\u2028Second paragraph.\n"));
  assert.ok(!generated.some((result) => /Not a note|tags:|date:/.test(result.content)));
  const previous = generated.find((result) => result.url === "/twtxt-2025.txt").content;
  assert.ok(previous.includes("2025-06-16T12:00:00+02:00\tArchived note.\n"));
});
