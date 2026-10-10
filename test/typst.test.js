import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import nunjucks from "nunjucks";

import { markdownToTypst, typstString } from "../eleventy/typst.js";
import { compileTypst } from "../scripts/compile-typst.mjs";

const render = markdownToTypst;

test("quotes Typst strings without treating text as executable markup", () =>
{
  assert.equal(typstString('"\\\n\r\t'), '"\\"\\\\\\n\\r\\t"');
  assert.equal(typstString("\u0000\b\f"), '"\\u{0}\\u{8}\\u{c}"');
  assert.equal(render("\\#read(\"secret\") \\[literal\\] \\$math\\$"),
    '#text("#read(“secret”) [literal] $math$")\n');
});

test("renders headings, paragraphs, emphasis, and strikethrough", () =>
{
  assert.equal(render("## A heading\n\nA **bold** and *italic* paragraph."), [
    '#heading(level: 2)[#text("A heading")]',
    "",
    '#text("A ")#strong[#text("bold")]#text(" and ")#emph[#text("italic")]#text(" paragraph.")',
    "",
  ].join("\n"));
  assert.equal(render("~~old~~"), '#strike[#text("old")]\n');
});

test("resolves links against the original web page and retains raw HTML anchors", () =>
{
  const output = render('[A link](../other/?a=1&b=2 "Title") and <a href="&#109;ailto:test@example.com">email</a>.',
    "/about/page/", { webOrigin: "https://example.org" });
  assert.ok(output.includes('#link("https://example.org/about/other/?a=1&b=2")[#text("A link")]'));
  assert.ok(output.includes('#link("mailto:test@example.com")[#text("email")]'));
  assert.equal(render("[Section](#contact)", "/about/"),
    '#link("https://hans.gerwitz.com/about/#contact")[#text("Section")]\n');
});

test("renders nested lists, ordered starts, quotations, terms, and tables", () =>
{
  const output = render([
    "- Outer",
    "  - Inner",
    "",
    "3. Third",
    "4. Fourth",
    "",
    "> A **quote**",
    "",
    "Term",
    ": Definition",
    "",
    "| Name | Value |",
    "| --- | --- |",
    "| One | 1 |",
    "",
    "---",
  ].join("\n"));
  assert.ok(output.includes('#list([#text("Outer")#list([#text("Inner")])])'));
  assert.ok(output.includes('#enum(start: 3, [#text("Third")], [#text("Fourth")])'));
  assert.ok(output.includes('#quote(block: true)[#text("A ")#strong[#text("quote")]]'));
  assert.ok(output.includes('#terms(terms.item([#text("Term")], [#text("Definition")]))'));
  assert.ok(output.includes('#table(columns: 2, [#strong[#text("Name")]], [#strong[#text("Value")]], [#text("One")], [#text("1")])'));
  assert.ok(output.includes("#block[#line(length: 100%)]"));
});

test("renders code as raw text, preserving its literal contents", () =>
{
  assert.equal(render('Use `#read("file")`.'), '#text("Use ")#raw("#read(\\"file\\")")#text(".")\n');
  assert.equal(render('```js\nconst name = "#literal";\n```'),
    '#raw("const name = \\"#literal\\";", block: true, lang: "js")\n');
  assert.equal(render("```text\ntrailing  \n```"),
    '#raw("trailing  ", block: true, lang: "text")\n');
});

test("renders image links with rich captions without fetching assets", () =>
{
  const output = render('![A [caption](https://example.com/caption)](/media/photo.jpg)', "/about/");
  assert.equal(output, '#figure(kind: image, numbering: none, caption: [#text("A ")#link("https://example.com/caption")[#text("caption")]])[#link("https://hans.gerwitz.com/media/photo.jpg")[#text("View image")]]\n');
  assert.equal(render("An inline ![photo](https://example.com/photo.jpg)."),
    '#text("An inline ")#link("https://example.com/photo.jpg")[#text("photo")]#text(".")\n');
});

test("emits footnote content once with repeated references and clickable note links", () =>
{
  const output = render("A note[^test] and again[^test].\n\n[^test]: Note with a [link](https://example.com/).");
  assert.equal(output, '#text("A note")#footnote[#text("Note with a ")#link("https://example.com/")[#text("link")]#text(".")]<md-footnote-1>#text(" and again")#footnote(<md-footnote-1>)#text(".")\n');
});

test("strips front matter, omits non-content HTML, and retains explicit line breaks", () =>
{
  assert.equal(render("---\r\ntitle: Metadata\r\n---\r\nHello<br>world.\n\n<script>hidden()</script>\n<style>hidden</style>"),
    '#text("Hello")#linebreak()#text("world.")\n');
  assert.equal(render(""), "");
});

test("the initial Typst expression renders the real About source through its layout", () =>
{
  const read = (filename) => readFileSync(new URL(`../${filename}`, import.meta.url), "utf8");
  const environment = new nunjucks.Environment();
  environment.addFilter("typst", markdownToTypst);
  environment.addFilter("typstString", typstString);
  const source = read("src/about/index.md");
  const content = environment.renderString(read("src/_editions/typst/index.typ")
    .replace(/^---\n[\s\S]*?\n---\n/, ""), {
    collections: { about: [{ url: "/about/", page: { rawInput: source } }] },
  });
  const output = environment.renderString(read("src/_layouts/typst.njk"), { title: 'Hans "Gerwitz"', content });
  assert.ok(output.includes('#set document(title: "Hans \\"Gerwitz\\"", author: "Hans Gerwitz")'));
  assert.ok(output.includes('#heading(level: 2)[#text("Contact")]'));
  assert.match(output, /#link\("mailto:[^"]+"\)\[#text\("email"\)\]/);
  assert.doesNotMatch(output, /<p>|&#109;|\{%|\{\{/);
});

test("compiles converted and native documents recursively and fails with no stale PDF", async (context) =>
{
  const directory = await mkdtemp(path.join(tmpdir(), "hgc-typst-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "nested"));
  const source = render([
    "## Compilation fixture",
    "",
    "**Bold**, *emphasis*, ~~strike~~, `code`, and a [link](https://example.com/).",
    "",
    "- Outer",
    "  - Inner",
    "",
    "3. Ordered item",
    "",
    "> Quotation",
    "",
    "Term",
    ": Definition",
    "",
    "| Name | Value |",
    "| --- | --- |",
    "| One | 1 |",
    "",
    "```js",
    "const name = \"literal\";",
    "```",
    "",
    "![A [caption](https://example.com/caption)](/media/photo.jpg)",
    "",
    "A note[^test] and again[^test].",
    "",
    "[^test]: Note with a [link](https://example.com/).",
  ].join("\n"));
  const nativePath = path.join(directory, "nested/native page.typ");
  await writeFile(path.join(directory, "index.typ"), source);
  await writeFile(nativePath, "= Native Typst\n\nA document.");

  const outputs = await compileTypst(directory);
  assert.deepEqual(outputs.map((output) => path.relative(directory, output)),
    ["index.pdf", path.join("nested", "native page.pdf")]);

  for (const output of outputs)
  {
    const pdf = await readFile(output);
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.ok(pdf.length > 1000);
  }

  assert.equal(await readFile(path.join(directory, "index.typ"), "utf8"), source);
  await writeFile(nativePath, "#unknown-function()");
  await assert.rejects(compileTypst(directory), /native page\.typ: Typst reported errors/);
  await assert.rejects(readFile(nativePath.replace(/\.typ$/, ".pdf")), { code: "ENOENT" });
});
