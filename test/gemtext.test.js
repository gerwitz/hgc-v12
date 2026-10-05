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

test("renders link-only list items directly without consuming reference numbers", () => {
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
      "Read more¹.",
      "",
      "## Footnotes",
      "",
      "=> https://hans.gerwitz.com/lists/more.html ¹ more",
      "",
    ].join("\n"),
  );
});

test("keeps prose in list items and defers multiple links to the footer", () => {
  const source = [
    "- Read [Stickers](brands/)",
    "- [Stickers](brands/) or [Stuff](things/)",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source, "/lists/"),
    [
      "* Read Stickers¹",
      "* Stickers² or Stuff³",
      "",
      "## Footnotes",
      "",
      "=> https://hans.gerwitz.com/lists/brands/ ¹ Stickers",
      "=> https://hans.gerwitz.com/lists/brands/ ² Stickers",
      "=> https://hans.gerwitz.com/lists/things/ ³ Stuff",
      "",
    ].join("\n"),
  );
});

test("defers inline Markdown links to superscript references in the footer", () => {
  const source = "Read [my writing](/writing/) or [an example](https://example.com/).";

  assert.equal(
    markdownToGemtext(source),
    [
      "Read my writing¹ or an example².",
      "",
      "## Footnotes",
      "",
      "=> https://hans.gerwitz.com/writing/ ¹ my writing",
      "=> https://example.com/ ² an example",
      "",
    ].join("\n"),
  );
});

test("labels deferred auto-linked URLs after the superscript reference number", () => {
  const source = "This is the most important new website of recent memory: https://industrystandard.tools/ seeks to share what products professionals prefer, without fluff or advertising.";

  assert.equal(
    markdownToGemtext(source),
    [
      "This is the most important new website of recent memory: https://industrystandard.tools/¹ seeks to share what products professionals prefer, without fluff or advertising.",
      "",
      "## Footnotes",
      "",
      "=> https://industrystandard.tools/ ¹ https://industrystandard.tools/",
      "",
    ].join("\n"),
  );
});

test("renders a standalone auto-linked URL without duplicate prose or label", () => {
  const url = "https://www.theguardian.com/us-news/2026/sep/30/tennessee-execution-halted-christa-pike";
  const paragraph = "Now that Tennessee has botched an execution, anyone want to bet that Trump calls for a return to hangings, or firing squads?";

  assert.equal(markdownToGemtext(`${paragraph}\n\n${url}`), `${paragraph}\n\n=> ${url}\n`);
});

test("renders standalone labeled links directly without consuming reference numbers", () => {
  const source = [
    '[**Source**](/notes/ "Original source")',
    "",
    "Read [more](https://example.com/more).",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source, "/", { routes: ["/notes/"] }),
    [
      "=> /notes/index.gmi Original source",
      "",
      "Read more¹.",
      "",
      "## Footnotes",
      "",
      "=> https://example.com/more ¹ more",
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
      "Read the neighbor¹, browse notes², or visit about³.",
      "",
      "## Footnotes",
      "",
      "=> /writing/neighbor.gmi ¹ Neighbor title",
      "=> /notes/index.gmi ² notes",
      "=> https://hans.gerwitz.com/about/ ³ about",
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
      "See about¹, lists², things³, and web only⁴.",
      "",
      "## Footnotes",
      "",
      "=> /about/index.gmi ¹ about",
      "=> /lists/index.gmi ² lists",
      "=> /lists/things/index.gmi ³ things",
      "=> https://hans.gerwitz.com/web-only/ ⁴ web only",
      "",
    ].join("\n"),
  );
});

test("renders standalone figures in place with Gemini media links", () => {
  const source = [
    "Before [a link](https://example.com/).",
    "",
    '![Diagram](/media/diagram.png "Full diagram")',
    "",
    "After the figure.",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source),
    [
      "Before a link¹.",
      "",
      "=> gemini://hans.gerwitz.com/media/diagram.png Full diagram",
      "",
      "After the figure.",
      "",
      "## Footnotes",
      "",
      "=> https://example.com/ ¹ a link",
      "",
    ].join("\n"),
  );
});

test("labels standalone figures without alternative text and preserves external URLs", () => {
  assert.equal(
    markdownToGemtext("![](https://images.example/image.jpg)"),
    "=> https://images.example/image.jpg Image\n",
  );
});

test("resolves relative and same-origin figure media URLs without changing extensions", () => {
  for (const source of [
    "![Caption](../../media/photo.jpg?size=full#detail)",
    "![Caption](https://hans.gerwitz.com/media/photo.jpg?size=full#detail)",
    "![Caption](gemini://hans.gerwitz.com/media/photo.jpg?size=full#detail)",
  ])
  {
    assert.equal(
      markdownToGemtext(source, "/posts/example.gmi"),
      "=> gemini://hans.gerwitz.com/media/photo.jpg?size=full#detail Caption\n",
    );
  }
});

test("uses the configured capsule hostname for standalone media figures", () => {
  assert.equal(
    markdownToGemtext("![Caption](/media/photo.jpg)", "/", { webOrigin: "https://capsule.example" }),
    "=> gemini://capsule.example/media/photo.jpg Caption\n",
  );
});

test("keeps inline images among ordinary footer references", () => {
  assert.equal(
    markdownToGemtext("Before ![Icon](/media/icon.png) after."),
    [
      "Before Icon¹ after.",
      "",
      "## Footnotes",
      "",
      "=> https://hans.gerwitz.com/media/icon.png ¹ Icon",
      "",
    ].join("\n"),
  );
});

test("shares ordered footer references between Markdown footnotes and their links", () => {
  const source = [
    "A statement.[^source] Another.[^detail]",
    "",
    "[^source]: Its [source](/source/).",
    "[^detail]: More detail.",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source),
    [
      "A statement.¹ Another.²",
      "",
      "## Footnotes",
      "",
      "¹ Its source³.",
      "² More detail.",
      "=> https://hans.gerwitz.com/source/ ³ source",
      "",
    ].join("\n"),
  );
});

test("defers references across multiple paragraphs until after the complete body", () =>
{
  const source = [
    "First [link](https://example.com/first).",
    "",
    "Second ![diagram](https://example.com/diagram.png).",
    "",
    "A final paragraph without references.",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source),
    [
      "First link¹.",
      "",
      "Second diagram².",
      "",
      "A final paragraph without references.",
      "",
      "## Footnotes",
      "",
      "=> https://example.com/first ¹ link",
      "=> https://example.com/diagram.png ² diagram",
      "",
    ].join("\n"),
  );
});

test("places quote and list references at the document end outside the quote", () =>
{
  const source = [
    "> Read [a quotation](https://example.com/quote).",
    "",
    "- Read [an item](https://example.com/item).",
    "- Another item.[^detail]",
    "",
    "The body ends here.",
    "",
    "[^detail]: More detail.",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source),
    [
      "> Read a quotation¹.",
      "",
      "* Read an item².",
      "* Another item.³",
      "",
      "The body ends here.",
      "",
      "## Footnotes",
      "",
      "=> https://example.com/quote ¹ a quotation",
      "=> https://example.com/item ² an item",
      "³ More detail.",
      "",
    ].join("\n"),
  );
});

test("numbers mixed references by first body mention and emits repeated footnotes once", () =>
{
  const source = [
    "Read [first](https://example.com/first), then this note.[^detail] See ![diagram](https://example.com/diagram.png).",
    "",
    "Repeat.[^detail] Another note.[^other] Read [last](https://example.com/last).",
    "",
    "[^other]: Another [source](https://example.com/other).",
    "[^detail]: More [detail](https://example.com/detail).",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source),
    [
      "Read first¹, then this note.² See diagram³.",
      "",
      "Repeat.² Another note.⁴ Read last⁵.",
      "",
      "## Footnotes",
      "",
      "=> https://example.com/first ¹ first",
      "² More detail⁶.",
      "=> https://example.com/diagram.png ³ diagram",
      "⁴ Another source⁷.",
      "=> https://example.com/last ⁵ last",
      "=> https://example.com/detail ⁶ detail",
      "=> https://example.com/other ⁷ source",
      "",
    ].join("\n"),
  );
});

test("preserves multiple blocks within a textual footnote in the shared footer", () =>
{
  const source = [
    "A statement.[^detail] Read [more](https://example.com/more).",
    "",
    "[^detail]: First paragraph with [detail](https://example.com/detail).",
    "",
    "    Second paragraph.",
    "",
    "    - First item",
    "    - Second item",
    "",
    "    > A quotation",
    "",
    "    ```text",
    "    Code example",
    "    ```",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source),
    [
      "A statement.¹ Read more².",
      "",
      "## Footnotes",
      "",
      "¹ First paragraph with detail³.",
      "",
      "Second paragraph.",
      "",
      "* First item",
      "* Second item",
      "",
      "> A quotation",
      "",
      "```",
      "Code example",
      "```",
      "=> https://example.com/more ² more",
      "=> https://example.com/detail ³ detail",
      "",
    ].join("\n"),
  );
});

test("preserves direct links and code fences at the start of textual footnotes", () =>
{
  const source = [
    "A statement.[^source] Another.[^code]",
    "",
    "[^source]: [Source](https://example.com/source)",
    "[^code]:",
    "    ```text",
    "    Example code",
    "    ```",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source),
    [
      "A statement.¹ Another.²",
      "",
      "## Footnotes",
      "",
      "¹",
      "=> https://example.com/source Source",
      "²",
      "```",
      "Example code",
      "```",
      "",
    ].join("\n"),
  );
});

test("defers footnote-body links even when definitions precede later body paragraphs", () =>
{
  const source = [
    "A statement.[^detail]",
    "",
    "[^detail]: More [detail](https://example.com/detail).",
    "",
    "A later [link](https://example.com/later).",
  ].join("\n");

  assert.equal(
    markdownToGemtext(source),
    [
      "A statement.¹",
      "",
      "A later link².",
      "",
      "## Footnotes",
      "",
      "¹ More detail³.",
      "=> https://example.com/later ² link",
      "=> https://example.com/detail ³ detail",
      "",
    ].join("\n"),
  );
});

test("uses Unicode superscript digits for single- and multi-digit reference numbers", () =>
{
  const source = Array.from({ length: 11 }, (_, index) =>
    `[link ${index + 1}](https://example.com/${index + 1})`).join(" ") + ".";

  assert.equal(
    markdownToGemtext(source),
    [
      "link 1¹ link 2² link 3³ link 4⁴ link 5⁵ link 6⁶ link 7⁷ link 8⁸ link 9⁹ link 10¹⁰ link 11¹¹.",
      "",
      "## Footnotes",
      "",
      "=> https://example.com/1 ¹ link 1",
      "=> https://example.com/2 ² link 2",
      "=> https://example.com/3 ³ link 3",
      "=> https://example.com/4 ⁴ link 4",
      "=> https://example.com/5 ⁵ link 5",
      "=> https://example.com/6 ⁶ link 6",
      "=> https://example.com/7 ⁷ link 7",
      "=> https://example.com/8 ⁸ link 8",
      "=> https://example.com/9 ⁹ link 9",
      "=> https://example.com/10 ¹⁰ link 10",
      "=> https://example.com/11 ¹¹ link 11",
      "",
    ].join("\n"),
  );
});

test("keeps the footer heading at level two unless the minimum heading level is three", () =>
{
  const source = "# A heading\n\nA statement.[^detail]\n\n[^detail]: More detail.";
  const cases = [
    { minimumHeadingLevel: 1, bodyHeading: "# A heading", footerHeading: "## Footnotes" },
    { minimumHeadingLevel: 2, bodyHeading: "## A heading", footerHeading: "## Footnotes" },
    { minimumHeadingLevel: 3, bodyHeading: "### A heading", footerHeading: "### Footnotes" },
  ];

  for (const { minimumHeadingLevel, bodyHeading, footerHeading } of cases)
  {
    assert.equal(
      markdownToGemtext(source, "/", { minimumHeadingLevel }),
      [
        bodyHeading,
        "",
        "A statement.¹",
        "",
        footerHeading,
        "",
        "¹ More detail.",
        "",
      ].join("\n"),
    );
  }
});

test("omits the footer when a document has no numbered references", () =>
{
  assert.equal(
    markdownToGemtext("# A heading\n\nA paragraph.", "/", { minimumHeadingLevel: 3 }),
    "### A heading\n\nA paragraph.\n",
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

test("renders link-only quotation attributions directly without consuming reference numbers", () => {
  const quotation = "Over four months, LLM users consistently underperformed at neural, linguistic, and behavioral levels.";
  const title = "Your Brain on ChatGPT: Accumulation of Cognitive Debt when Using an AI Assistant for Essay Writing Task";
  const url = "https://arxiv.org/abs/2506.08872";

  assert.equal(
    markdownToGemtext(`> ${quotation}\n> -- [${title}](${url})\n\nRead [more](https://example.com/more).`),
    [
      `> ${quotation}`,
      "",
      `=> ${url} — ${title}`,
      "",
      "Read more¹.",
      "",
      "## Footnotes",
      "",
      "=> https://example.com/more ¹ more",
      "",
    ].join("\n"),
  );
});

test("preserves attribution prose and defers its inline links to the footer", () => {
  assert.equal(
    markdownToGemtext("> A quotation\n> -- The author, in [a paper](https://example.com/paper)"),
    [
      "> A quotation",
      "",
      "— The author, in a paper¹",
      "",
      "## Footnotes",
      "",
      "=> https://example.com/paper ¹ a paper",
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
