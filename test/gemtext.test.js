import assert from "node:assert/strict";
import test from "node:test";

import { geminiPath, markdownToGemtext } from "../eleventy/gemtext.js";

test("converts Markdown structure directly to gemtext", () => {
  const source = [
    "## A heading",
    "",
    "A paragraph.",
    "",
    "> A quotation",
    "",
    "- First item",
    "- Second item",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source),
    [
      "## A heading",
      "",
      "A paragraph.",
      "",
      "> A quotation",
      "",
      "* First item",
      "* Second item",
      "",
    ].join("\n"),
  );
});

test("renders link-only list items as Gemtext links", () => {
  const source = [
    "- [Stickers](brands/)",
    "- [Stuff](things/ \"Things to recommend\")",
    "- [*Elementary* Lessons](lessons/)",
    "",
    "Read [more](more.html).",
  ].join("\n");
  const configuration = { collections: ["lists"] };
  const lists = [
    { url: "/lists/brands/" },
    { url: "/lists/things/" },
    { url: "/lists/lessons/" },
  ];

  assert.equal(
    markdownToGemtext(source, "/lists/", configuration, { lists }),
    [
      "=> /lists/brands/index.gmi Stickers",
      "=> /lists/things/index.gmi Things to recommend",
      "=> /lists/lessons/index.gmi Elementary Lessons",
      "",
      "Read more(1).",
      "=> https://hans.gerwitz.com/lists/more.html (1) more",
      "",
    ].join("\n"),
  );
});

test("keeps prose and multiple links in list items", () => {
  const source = [
    "- Read [Stickers](brands/)",
    "- [Stickers](brands/) or [Stuff](things/)",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source, "/lists/"),
    [
      "* Read Stickers(1)",
      "=> https://hans.gerwitz.com/lists/brands/ (1) Stickers",
      "* Stickers(2) or Stuff(3)",
      "=> https://hans.gerwitz.com/lists/brands/ (2) Stickers",
      "=> https://hans.gerwitz.com/lists/things/ (3) Stuff",
      "",
    ].join("\n"),
  );
});

test("moves Markdown links onto gemtext link lines", () => {
  const source = "Read [my writing](/writing/) or [an example](https://example.com/).";

  assert.equal(
    markdownToGemtext(source),
    [
      "Read my writing(1) or an example(2).",
      "=> https://hans.gerwitz.com/writing/ (1) my writing",
      "=> https://example.com/ (2) an example",
      "",
    ].join("\n"),
  );
});

test("shows auto-linked URLs after the reference number", () => {
  const source = "This is the most important new website of recent memory: https://industrystandard.tools/ seeks to share what products professionals prefer, without fluff or advertising.";

  assert.equal(
    markdownToGemtext(source),
    [
      "This is the most important new website of recent memory: https://industrystandard.tools/(1) seeks to share what products professionals prefer, without fluff or advertising.",
      "=> https://industrystandard.tools/ (1) https://industrystandard.tools/",
      "",
    ].join("\n"),
  );
});

test("maps only known edition routes to Gemini and uses link titles", () => {
  const source = [
    "Read the [neighbor](neighbor.html \"Neighbor title\"),",
    "browse [notes](/notes/), or visit [about](/about/).",
  ].join(" ");
  const configuration = {
    routes: ["/notes/"],
    collections: ["writing"],
    webOrigin: "https://hans.gerwitz.com",
  };
  const writing = [
    {
      url: "/writing/neighbor.html",
    },
  ];

  assert.equal(
    markdownToGemtext(source, "/writing/current.html", configuration, { writing }),
    [
      "Read the neighbor(1), browse notes(2), or visit about(3).",
      "=> /writing/neighbor.gmi (1) Neighbor title",
      "=> /notes/index.gmi (2) notes",
      "=> https://hans.gerwitz.com/about/ (3) about",
      "",
    ].join("\n"),
  );
});

test("maps merged posts to canonical capsule URLs while preserving query and fragment", () => {
  const configuration = {
    collections: ["gemlog"],
    routes: ["/posts/"],
    routeAliases: { "/writing/": "/posts/" },
  };
  const gemlog = [
    { url: "/writing/neighbor.html", geminiUrl: "/posts/2026-09-01-neighbor.gmi" },
    { url: false, geminiUrl: "/posts/2026-09-02-capsule.gmi" },
  ];
  const source = "- [Neighbor](neighbor.html?view=full#section)\n- [Archive](/writing/)\n- [Capsule](/posts/2026-09-02-capsule.gmi)";

  assert.equal(
    markdownToGemtext(source, "/writing/current.html", configuration, { gemlog }),
    [
      "=> /posts/2026-09-01-neighbor.gmi?view=full#section Neighbor",
      "=> /posts/ Archive",
      "=> /posts/2026-09-02-capsule.gmi Capsule",
      "",
    ].join("\n"),
  );

  assert.equal(
    markdownToGemtext("- [Neighbor](2026-09-01-neighbor.gmi)\n- [This section](#section)",
      "/posts/2026-09-02-capsule.gmi", configuration, { gemlog }),
    "=> /posts/2026-09-01-neighbor.gmi Neighbor\n=> /posts/2026-09-02-capsule.gmi#section This section\n",
  );
});

test("maps static page collections to Gemini routes", () => {
  const source = "See [about](/about/), [lists](/lists/), [things](/lists/things/), and [web only](/web-only/).";
  const configuration = {
    routes: ["/about/", "/lists/"],
    collections: ["about", "lists"],
  };
  const about = [{ url: "/about/flaws/" }];
  const lists = [{ url: "/lists/things/" }];
  const webOnly = [{ url: "/web-only/" }];

  assert.equal(
    markdownToGemtext(source, "/", configuration, { about, lists, webOnly }),
    [
      "See about(1), lists(2), things(3), and web only(4).",
      "=> /about/index.gmi (1) about",
      "=> /lists/index.gmi (2) lists",
      "=> /lists/things/index.gmi (3) things",
      "=> https://hans.gerwitz.com/web-only/ (4) web only",
      "",
    ].join("\n"),
  );
});

test("renders standalone figures as links", () => {
  const source = '![Diagram](/media/diagram.png "Full diagram")';

  assert.equal(
    markdownToGemtext(source),
    [
      "Diagram(1)",
      "=> https://hans.gerwitz.com/media/diagram.png (1) Full diagram",
      "",
    ].join("\n"),
  );
});

test("labels standalone figures without alternative text", () => {
  const source = "![](https://images.example/image.jpg)";

  assert.equal(
    markdownToGemtext(source),
    [
      "Image(1)",
      "=> https://images.example/image.jpg (1) Image",
      "",
    ].join("\n"),
  );
});

test("renders footnotes using the configured Markdown extension", () => {
  const source = [
    "A statement.[^source] Another.[^detail]",
    "",
    "[^source]: Its [source](/source/).",
    "[^detail]: More detail.",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source),
    [
      "A statement.(1) Another.(2)",
      "",
      "(1) Its source(3).",
      "=> https://hans.gerwitz.com/source/ (3) source",
      "",
      "(2) More detail.",
      "",
    ].join("\n"),
  );
});

test("renders quotation attribution using the configured Markdown extension", () => {
  const source = [
    "> A quotation",
    "> -- The author",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source),
    [
      "> A quotation",
      "",
      "— The author",
      "",
    ].join("\n"),
  );
});

test("ignores front matter", () => {
  const source = [
    "---",
    "title: An example",
    "---",
    "",
    "The document body.",
  ].join("\n");

  assert.equal(markdownToGemtext(source), "The document body.\n");
});

test("maps web output paths to gemini resources", () => {
  assert.equal(geminiPath("/"), "/index.gmi");
  assert.equal(geminiPath("/writing/"), "/writing/index.gmi");
  assert.equal(geminiPath("/2026/09/example.html"), "/2026/09/example.gmi");
});
