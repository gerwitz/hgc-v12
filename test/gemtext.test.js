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

test("maps only known edition routes to Gemini and uses link titles", () => {
  const source = [
    "Read the [neighbor](neighbor.html \"Neighbor title\"),",
    "browse [notes](/notes/), or visit [about](/about/).",
  ].join(" ");
  const configuration = {
    routes: ["/notes/"],
    webOrigin: "https://hans.gerwitz.com",
  };
  const writing = [
    {
      url: "/writing/neighbor.html",
    },
  ];

  assert.equal(
    markdownToGemtext(source, "/writing/current.html", configuration, writing),
    [
      "Read the neighbor(1), browse notes(2), or visit about(3).",
      "=> /writing/neighbor.gmi (1) Neighbor title",
      "=> /notes/index.gmi (2) notes",
      "=> https://hans.gerwitz.com/about/ (3) about",
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
