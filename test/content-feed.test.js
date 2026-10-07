import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { load } from "js-yaml";
import { DOMParser } from "linkedom";
import nunjucks from "nunjucks";

import { getContentFeedItems } from "../eleventy/content-feed.js";
import { getContentSources } from "../eleventy/content-listing.js";
import feedData from "../src/feeds/content.rss.11tydata.js";
import listingData from "../src/site/content.11tydata.js";

const feedSource = readFileSync(new URL("../src/feeds/content.rss.njk", import.meta.url), "utf8");
const feedMetadata = load(feedSource.match(/^---\n([\s\S]*?)\n---\n/)[1]);
const feedTemplate = feedSource.replace(/^---\n[\s\S]*?\n---\n/, "");

const createWebItem = (slug, data = {}) => ({
  inputPath: `./src/ideas/${slug}.md`,
  fileSlug: slug,
  url: `/ideas/${slug}/`,
  date: new Date("2099-01-01T00:00:00Z"),
  data: { title: slug, tags: ["ideas"], contentDate: null, ...data },
});

const createGempost = (slug, data = {}) => ({
  inputPath: `./src/gemposts/2026-01-02-${slug}.md`,
  fileSlug: slug,
  url: false,
  date: new Date("2026-01-02T12:00:00Z"),
  data: { title: slug, tags: ["gemposts"], contentDate: null, excludeFromFeed: true, ...data },
});

const createUndatedGempost = (slug, data = {}) =>
{
  const item = createGempost(slug, data);
  item.inputPath = `./src/gemposts/${slug}.md`;
  return item;
};

const forbidContentAccess = (item) =>
{
  for (const property of ["templateContent", "content"])
  {
    Object.defineProperty(item, property, {
      enumerable: true,
      get: () =>
      {
        throw new Error(`Premature ${property} access`);
      },
    });
  }

  return item;
};

const renderFeed = (collections, gitDates, autoescape = false) =>
{
  const environment = new nunjucks.Environment(null, { autoescape });
  const contentFeed = feedData.eleventyComputed.contentFeed({ collections, gitDates });
  const xml = environment.renderString(feedTemplate, { ...feedMetadata, contentFeed });
  const document = new DOMParser().parseFromString(xml, "text/xml");

  return { xml, document, items: Array.from(document.querySelectorAll("item")) };
};

const canonicalWebUrl = (item) => new URL(item.url, "https://hans.gerwitz.com").href;

test("shared content sources preserve web references and safely project only published gemposts", () =>
{
  const web = forbidContentAccess(createWebItem("web", { excludeFromFeed: true }));
  const gempost = forbidContentAccess(createGempost("capsule"));
  const draft = createGempost("draft", { draft: true, updated: "invalid" });
  const unrelated = createWebItem("not-searchable");
  const collections = {
    searchable: [web],
    gemposts: [gempost, draft],
    all: [web, gempost, draft, unrelated],
    microblog: [unrelated],
  };
  const sources = getContentSources(collections);

  assert.equal(sources.length, 2);
  assert.equal(sources[0], web);
  assert.notEqual(sources[1], gempost);
  assert.equal(sources[1].data, gempost.data);
  assert.equal(sources[1].inputPath, gempost.inputPath);
  assert.equal(sources[1].date, gempost.date);
  assert.equal(sources[1].url, "gemini://hans.gerwitz.com/gemlog/2026-01-02-capsule.gmi");
  assert.equal(sources[1].data.contentDate, null);
  assert.equal(gempost.url, false);
  assert.deepEqual(getContentFeedItems(collections).map((item) => item.guid).sort(), [
    sources[1].url,
    canonicalWebUrl(web),
  ].sort());
});

test("shared sources and the feed work without a gemposts collection", () =>
{
  const web = createWebItem("web");

  assert.equal(getContentSources({ searchable: [web] })[0], web);
  assert.equal(getContentFeedItems({ searchable: [web] })[0].guid, canonicalWebUrl(web));
  assert.deepEqual(getContentFeedItems({ searchable: [] }), []);
});

test("shared sources and listing handle a missing searchable collection without changing eligibility", () =>
{
  const gempost = createGempost("published");
  const draft = createGempost("draft", { draft: true });
  const collections = { gemposts: [gempost, draft] };
  const sources = getContentSources(collections);
  const groups = listingData.eleventyComputed.contentGroups({ collections });

  assert.deepEqual(getContentSources({}), []);
  assert.deepEqual(getContentFeedItems({}), []);
  assert.deepEqual(listingData.eleventyComputed.contentGroups({ collections: {} }), []);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].data, gempost.data);
  assert.equal(getContentFeedItems(collections)[0].guid, sources[0].url);
  assert.deepEqual(groups.map((group) => group.title), ["Gemposts"]);
  assert.equal(groups[0].items[0].url, sources[0].url);
});

test("listing preserves searchable references when their URLs are not strings", () =>
{
  for (const url of [false, null, undefined])
  {
    const web = createWebItem("nonstring-url");
    web.url = url;
    const collections = { searchable: [web] };
    const groups = listingData.eleventyComputed.contentGroups({ collections });

    assert.equal(getContentSources(collections)[0], web);
    assert.equal(groups[0].items[0], web);
    assert.equal(groups[0].items[0].url, url);
  }
});

test("updated overrides authored, filename-inferred, and Git dates even when it is older", () =>
{
  const updated = "2019-01-02T12:34:56+02:00";
  const authored = createWebItem("authored", {
    date: "2024-01-01",
    contentDate: new Date("2024-01-01"),
    updated,
  });
  const filename = createWebItem("2025-01-01-filename", {
    contentDate: new Date("2025-01-01"),
    updated: new Date(updated),
  });
  const undated = createWebItem("undated", { updated });
  const gempost = createGempost("updated", {
    contentDate: new Date("2026-01-02"),
    updated,
  });
  const sources = [authored, filename, undated, gempost];
  const gitDates = Object.fromEntries(sources.map((item) => [
    item.inputPath.replace(/^\.\//, ""), "2027-01-01T00:00:00Z",
  ]));
  const feed = getContentFeedItems({ searchable: sources.slice(0, 3), gemposts: [gempost] }, gitDates);

  assert.equal(feed.length, sources.length);
  assert.ok(feed.every((item) => item.pubDate === "Wed, 02 Jan 2019 10:34:56 GMT"));
  assert.equal(authored.data.contentDate.toISOString(), "2024-01-01T00:00:00.000Z");
  assert.equal(gempost.data.contentDate.toISOString(), "2026-01-02T00:00:00.000Z");
});

test("intentional authored and filename-inferred contentDate precede Git dates", () =>
{
  const authored = createWebItem("authored", {
    date: "2022-02-03T04:05:06Z",
    contentDate: new Date("2022-02-03T04:05:06Z"),
  });
  const filename = createWebItem("2021-03-04-filename", { contentDate: new Date("2021-03-04") });
  filename.date = new Date("2021-03-04");
  const gempost = createGempost("authored", { contentDate: new Date("2020-04-05") });
  const gitDates = {
    "src/ideas/authored.md": "2028-01-01T00:00:00Z",
    "src/ideas/2021-03-04-filename.md": "2028-01-01T00:00:00Z",
    "src/gemposts/2026-01-02-authored.md": "2028-01-01T00:00:00Z",
  };
  const feed = getContentFeedItems({ searchable: [filename, authored], gemposts: [gempost] }, gitDates);

  assert.deepEqual(feed.map((item) => item.pubDate), [
    "Thu, 03 Feb 2022 04:05:06 GMT",
    "Thu, 04 Mar 2021 00:00:00 GMT",
    "Sun, 05 Apr 2020 00:00:00 GMT",
  ]);
});

test("explicit source dates precede filename and Git dates when contentDate has not resolved", () =>
{
  const authoredDate = "2019-02-03T04:05:06+02:00";

  for (const contentDate of [null, undefined])
  {
    for (const date of [authoredDate, new Date(authoredDate)])
    {
      const web = createWebItem("2025-01-01-authored", { contentDate, date });
      const gempost = createGempost("authored", { contentDate, date });
      const collections = { searchable: [web], gemposts: [gempost] };
      const gitDates = {
        "src/ideas/2025-01-01-authored.md": "2028-01-01T00:00:00Z",
        "src/gemposts/2026-01-02-authored.md": "2028-01-01T00:00:00Z",
      };
      const feed = feedData.eleventyComputed.contentFeed({ collections, gitDates });

      assert.equal(feed.length, 2);
      assert.ok(feed.every((item) => item.pubDate === "Sun, 03 Feb 2019 02:05:06 GMT"));
      assert.equal(web.data.contentDate, contentDate);
      assert.equal(gempost.data.contentDate, contentDate);
      assert.equal(web.data.date, date);
      assert.equal(gempost.data.date, date);
    }
  }
});

test("intentional filename dates precede Git when contentDate has not resolved", () =>
{
  for (const contentDate of [null, undefined])
  {
    const web = createWebItem("2021-03-04-filename", { contentDate });
    const gempost = createGempost("filename", { contentDate });
    const feed = feedData.eleventyComputed.contentFeed({
      collections: { searchable: [web], gemposts: [gempost] },
      gitDates: {
        "src/ideas/2021-03-04-filename.md": "2028-01-01T00:00:00Z",
        "src/gemposts/2026-01-02-filename.md": "2028-01-01T00:00:00Z",
      },
    });

    assert.deepEqual(feed.map((item) => item.pubDate), [
      "Fri, 02 Jan 2026 00:00:00 GMT",
      "Thu, 04 Mar 2021 00:00:00 GMT",
    ]);
    assert.equal(web.data.contentDate, contentDate);
    assert.equal(gempost.data.contentDate, contentDate);
  }
});

test("invalid filename dates and dated directories do not supply publication dates", () =>
{
  for (const inputPath of [
    "./src/ideas/2026-02-30-impossible.md",
    "./src/ideas/2025-02-29-impossible.md",
    "./src/ideas/2020-01-01-directory/undated.md",
    "./src/ideas/2025-01-02suffix.md",
  ])
  {
    const web = createWebItem("undated");
    web.inputPath = inputPath;

    assert.equal(getContentFeedItems({ searchable: [web] })[0].pubDate, undefined);
    assert.equal(getContentFeedItems({ searchable: [web] }, {
      [inputPath.replace(/^\.\//, "")]: "2000-01-01T00:00:00Z",
    })[0].pubDate, "Sat, 01 Jan 2000 00:00:00 GMT");
  }
});

test("Git fallback uses repository-relative paths and ignores filesystem item dates", () =>
{
  const web = createWebItem("logic");
  const gempost = createUndatedGempost("undated");
  const gitDates = {
    "src/ideas/logic.md": "2001-02-03T04:05:06-07:00",
    "src/gemposts/undated.md": "2000-01-02T00:00:00Z",
  };
  const collections = { searchable: [web], gemposts: [gempost] };
  const before = getContentFeedItems(collections, gitDates);
  web.date = new Date("2100-01-01");
  web.inputPath = "src/ideas/logic.md";
  const after = getContentFeedItems(collections, gitDates);

  assert.deepEqual(after, before);
  assert.deepEqual(before.map((item) => item.pubDate), [
    "Sat, 03 Feb 2001 11:05:06 GMT",
    "Sun, 02 Jan 2000 00:00:00 GMT",
  ]);
  assert.equal(web.data.contentDate, null);
  assert.equal(gempost.data.contentDate, null);
});

test("undated untracked sources remain in RSS without item or channel pubDate", () =>
{
  for (const contentDate of [null, undefined])
  {
    const web = createWebItem("untracked", { contentDate });
    const gempost = createUndatedGempost("untracked", { contentDate });
    const collections = { searchable: [web], gemposts: [gempost] };
    const { xml, items } = renderFeed(collections, {});

    assert.equal(items.length, 2);
    assert.ok(getContentFeedItems(collections).every((item) => item.date === null && item.pubDate === undefined));
    assert.doesNotMatch(xml, /<pubDate>/);
  }

  assert.equal(renderFeed({ searchable: [] }).items.length, 0);
});

test("build-time estimates fill only uncatalogued dates without overriding known or explicit dates", () =>
{
  const known = createWebItem("known");
  const explicit = createWebItem("explicit", { date: "2020-01-01", updated: "2025-01-01" });
  const unknown = createWebItem("new-bot-content");
  const generated = new Date("2026-10-07T12:00:00Z");
  const feed = feedData.eleventyComputed.contentFeed({
    collections: { searchable: [known, explicit, unknown] },
    gitDates: { "src/ideas/known.md": "2001-02-03T04:05:06Z" },
    generated,
  });
  const dates = Object.fromEntries(feed.map((item) => [item.title, item.pubDate]));

  assert.equal(dates["known"], "Sat, 03 Feb 2001 04:05:06 GMT");
  assert.equal(dates["explicit"], "Wed, 01 Jan 2025 00:00:00 GMT");
  assert.equal(dates["new-bot-content"], generated.toUTCString());
});

test("a missing date catalog still produces a dated feed for all content", () =>
{
  const generated = new Date("2026-10-07T12:00:00Z");
  const collections = { searchable: [createWebItem("new-idea")], gemposts: [createGempost("capsule")] };
  const feed = feedData.eleventyComputed.contentFeed({ collections, generated });

  assert.equal(feed.length, 2);
  assert.ok(feed.every((item) => item.pubDate));
  assert.equal(feed.find((item) => item.title === "new-idea").pubDate, generated.toUTCString());
});

test("invalid explicit updated throws an actionable source-specific error instead of falling back", () =>
{
  for (const updated of ["invalid", "", "2026-13-99", "2026-02-30", "2025-02-29", null, true, 42, new Date("invalid")])
  {
    const web = createWebItem("invalid", { contentDate: new Date("2020-01-01"), updated });

    assert.throws(() => getContentFeedItems({ searchable: [web] }, {
      "src/ideas/invalid.md": "2021-01-01T00:00:00Z",
    }), /Invalid updated date in \.\/src\/ideas\/invalid\.md:.*valid ISO date or remove it/);
  }

  assert.throws(() => getContentFeedItems({ searchable: [], gemposts: [createGempost("invalid", {
    updated: "not-a-date",
  })] }), /Invalid updated date in \.\/src\/gemposts\/2026-01-02-invalid\.md/);
});

test("RSS escapes titles, summaries, and canonical URLs with or without template autoescaping", () =>
{
  const title = "A & <B> \"C\" 'D'";
  const description = "Summary & <details> \"quoted\" 'text' ]]>";
  const web = createWebItem("escaped", { title, description, subtitle: "unused" });
  web.url = "/ideas/escaped/?first=1&second=2";
  const gempost = createGempost("subtitle", { subtitle: "Gemini & <summary>" });
  const untitled = createWebItem("untitled", { title: "" });

  for (const autoescape of [false, true])
  {
    const { xml, items } = renderFeed({ searchable: [web, untitled], gemposts: [gempost] }, {}, autoescape);
    const webItem = items.find((item) => item.querySelector("link").textContent === canonicalWebUrl(web));
    const geminiItem = items.find((item) => item.querySelector("link").textContent.startsWith("gemini://"));
    const untitledItem = items.find((item) => item.querySelector("link").textContent === canonicalWebUrl(untitled));

    assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
    assert.equal(webItem.querySelector("title").textContent, title);
    assert.equal(webItem.querySelector("description").textContent, description);
    assert.equal(webItem.querySelector("guid").textContent, canonicalWebUrl(web));
    assert.equal(webItem.querySelector("B"), null);
    assert.equal(geminiItem.querySelector("description").textContent, gempost.data.subtitle);
    assert.equal(untitledItem.querySelector("title").textContent, "untitled");
    assert.equal(untitledItem.querySelector("description"), null);
    assert.match(xml, /A &amp; &lt;B&gt;/);
    assert.match(xml, /first=1&amp;second=2/);
    assert.doesNotMatch(xml, /&amp;amp;/);
  }
});

test("canonical URL GUIDs remain stable when dates, titles, and descriptions change", () =>
{
  const web = createWebItem("stable", { contentDate: new Date("2020-01-01") });
  const gempost = createGempost("stable", { contentDate: new Date("2026-01-02") });
  const collections = { searchable: [web], gemposts: [gempost] };
  const original = getContentFeedItems(collections).map((item) => item.guid).sort();

  for (const source of [web, gempost])
  {
    source.data.updated = "2027-01-01T00:00:00Z";
    source.data.title = "Changed title";
    source.data.description = "Changed summary";
  }

  const { items } = renderFeed(collections, { "src/ideas/stable.md": "2028-01-01T00:00:00Z" });
  assert.deepEqual(items.map((item) => item.querySelector("guid").textContent).sort(), original);
  assert.deepEqual(original, [
    "gemini://hans.gerwitz.com/gemlog/2026-01-02-stable.gmi",
    "https://hans.gerwitz.com/ideas/stable/",
  ]);
  assert.ok(items.every((item) => item.querySelector("guid").getAttribute("isPermaLink") === "true"));
});

test("RSS includes all listing sources beyond 50 and sorts by effective pubDate with undated items last", () =>
{
  const searchable = Array.from({ length: 65 }, (_, index) => createWebItem(`entry-${index}`, {
    contentDate: new Date(Date.UTC(2020, 0, index + 1)),
    tags: [["ideas", "lists", "notes", "projects", "site", "writing"][index % 6]],
  }));
  const gemposts = Array.from({ length: 5 }, (_, index) => createGempost(`capsule-${index}`, {
    contentDate: new Date(Date.UTC(2021, 0, index + 1)),
  }));
  searchable[0].data.updated = "2029-01-01T00:00:00Z";
  const undated = createWebItem("undated");
  searchable.push(undated);
  gemposts.push(createGempost("draft", { draft: true }));
  const collections = { searchable, gemposts, all: [createWebItem("excluded")] };
  const originalWebOrder = searchable.slice();
  const originalGeminiOrder = gemposts.slice();
  const groups = listingData.eleventyComputed.contentGroups({ collections });
  const listingUrls = groups.flatMap((group) => group.items.map((item) => canonicalWebUrl(item))).sort();
  const { items, document } = renderFeed(collections, {});
  const datedItems = items.filter((item) => item.querySelector("pubDate"));
  const timestamps = datedItems.map((item) => Date.parse(item.querySelector("pubDate").textContent));

  assert.equal(items.length, 71);
  assert.deepEqual(items.map((item) => item.querySelector("guid").textContent).sort(), listingUrls);
  assert.deepEqual(timestamps, timestamps.slice().sort((first, second) => second - first));
  assert.equal(items[0].querySelector("link").textContent, canonicalWebUrl(searchable[0]));
  assert.equal(items.at(-1).querySelector("link").textContent, canonicalWebUrl(undated));
  assert.equal(items.at(-1).querySelector("pubDate"), null);
  assert.equal(document.querySelector("channel > pubDate").textContent, "Mon, 01 Jan 2029 00:00:00 GMT");
  assert.deepEqual(searchable, originalWebOrder);
  assert.deepEqual(gemposts, originalGeminiOrder);
});

test("listing keeps authored and Gemini display dates separate from RSS updated and Git dates", () =>
{
  const web = createWebItem("dated", {
    contentDate: new Date("2020-01-01"),
    updated: "2028-01-01T00:00:00Z",
  });
  const older = createGempost("older", { updated: "2030-01-01T00:00:00Z" });
  older.date = new Date("2026-01-01");
  const newer = createUndatedGempost("newer");
  const collections = { searchable: [web], gemposts: [older, newer] };
  const groups = listingData.eleventyComputed.contentGroups({ collections });
  const geminiItems = groups.find((group) => group.title === "Gemposts").items;
  const feed = getContentFeedItems(collections, {
    "src/gemposts/newer.md": "2000-01-01T00:00:00Z",
  });

  assert.deepEqual(geminiItems.map((item) => item.fileSlug), ["newer", "older"]);
  assert.equal(geminiItems[0].data.contentDate, newer.date);
  assert.equal(geminiItems[1].data.contentDate, older.date);
  assert.equal(groups.find((group) => group.title === "Ideas").items[0], web);
  assert.equal(web.data.contentDate.toISOString(), "2020-01-01T00:00:00.000Z");
  assert.equal(newer.data.contentDate, null);
  assert.equal(older.data.contentDate, null);
  assert.deepEqual(feed.map((item) => item.pubDate), [
    "Tue, 01 Jan 2030 00:00:00 GMT",
    "Sat, 01 Jan 2028 00:00:00 GMT",
    "Sat, 01 Jan 2000 00:00:00 GMT",
  ]);
});

test("feed has the requested permalink and is linked from the feeds index", () =>
{
  const index = readFileSync(new URL("../src/feeds/index.njk", import.meta.url), "utf8");

  assert.equal(feedMetadata.permalink, "/feeds/everything.rss");
  assert.equal(feedMetadata.eleventyExcludeFromCollections, true);
  assert.equal(feedMetadata.layout, false);
  assert.match(index, /href="\/feeds\/everything\.rss"/);
  const { document } = renderFeed({ searchable: [] });
  assert.equal(document.querySelector('[rel="self"]').getAttribute("href"), "https://hans.gerwitz.com/feeds/everything.rss");
  assert.equal(document.querySelector("channel > title").textContent, "hans.gerwitz.com — everything");
});
