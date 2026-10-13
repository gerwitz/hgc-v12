import assert from "node:assert/strict";
import test from "node:test";

import { parseHTML } from "linkedom";

import urlsPlugin from "../eleventy/urls.js";

let transform;
urlsPlugin({ addTransform: (name, callback) => { transform = callback; } });
const render = (html, outputPath = "about/index.html") => transform.call({ page: { outputPath } }, html);

const encodedEmail = "&#109;&#097;&#105;&#108;&#116;&#111;:&#104;&#097;&#110;&#115;&#064;&#103;&#101;&#114;&#119;&#105;&#116;&#122;&#046;&#099;&#111;&#109;";

test("encoded mailto URLs remain byte-for-byte unchanged and decode correctly", () =>
{
  for (const quote of ['"', "'", ""])
  {
    const html = `<a rel="me" href=${quote}${encodedEmail}${quote} title="since 1990">email</a>`;
    const output = render(html);
    assert.equal(output, html);
    assert.equal(parseHTML(output).document.querySelector("a").getAttribute("href"), "mailto:hans@gerwitz.com");
  }
});

test("encoded schemes, external URLs, and fragments retain their original representation", () =>
{
  for (const url of [
    "&#x6d;ailto:person@example.com",
    "mailto&colon;person@example.com",

    "https&colon;//external.example/undated",
    "&#35;section",
    "//external.example/undated",
  ])
  {
    const html = `<a href="${url}">Link</a>`;
    assert.equal(render(html), html);
  }
});

test("Gemini links get separate accessible glyph controls and two-line options", () =>
{
  const source = '<a class="gemini-link" href="gemini://example.com:1966/post?q=one&amp;next=two#section">A post</a>';
  const html = `<p><span id="gemini-link-options-1"></span>${source} and <a href="&#103;emini://example.com/other">Another</a> or <a href="/about">About</a>.</p>`;
  const output = render(html);
  const { document } = parseHTML(output);
  const controls = document.querySelectorAll(".gemini-link-control");

  assert.equal(controls.length, 2);
  assert.ok(output.includes(source));
  assert.ok(output.includes('href="&#103;emini://example.com/other"'));
  assert.equal(document.querySelectorAll("p").length, 1);

  for (const control of controls)
  {
    const trigger = control.querySelector("button");
    const panel = control.querySelector("[popover]");
    assert.equal(trigger.getAttribute("type"), "button");
    assert.equal(trigger.getAttribute("popovertarget"), panel.id);
    assert.equal(trigger.getAttribute("aria-label"), "Geminispace link options");
    assert.equal(panel.children.length, 2);
    assert.equal(panel.firstElementChild.textContent, "Geminispace link more info");
    assert.equal(panel.lastElementChild.textContent, "view with Gemini browser view in proxy");
  }

  const panel = controls[0].querySelector("[popover]");
  const links = panel.querySelectorAll("a");
  assert.equal(links[0].getAttribute("href"), "/2026/10/07/gemposts.html");
  assert.equal(links[1].getAttribute("href"), "gemini://example.com:1966/post?q=one&next=two#section");
  assert.equal(links[2].getAttribute("href"), "https://portal.mozz.us/gemini/example.com:1966/post?q=one&next=two#section");
  assert.equal(new Set(Array.from(controls, (control) => control.querySelector("[popover]").id)).size, 2);
  assert.notEqual(panel.id, "gemini-link-options-1");
  assert.equal(document.querySelector('a[href="/about/"]').closest(".gemini-link-wrapper"), null);
  assert.equal(render(source, "feeds/everything.rss"), source);
});

test("internal paths still normalize without corrupting encoded query parameters", () =>
{
  const cases = [
    ["/about", "/about/"],
    ["/2026/10/07/gemposts", "/2026/10/07/gemposts.html"],
    ["/ideas?first=1&amp;second=2#section", "/ideas/?first=1&amp;second=2#section"],
    ["/&#97;bout", "/about/"],
    ["https://hans.gerwitz.com/ideas?first=1&amp;second=2", "https://hans.gerwitz.com/ideas/?first=1&amp;second=2"],
  ];
  for (const [source, expected] of cases)
  {
    assert.equal(render(`<a href="${source}">Link</a>`), `<a href="${expected}">Link</a>`);
  }
});

test("changed URLs escape decoded attribute characters and quote unquoted values", () =>
{
  for (const quote of ['"', "'", ""])
  {
    const equals = quote ? "=" : "&#61;";
    const source = `<form action=${quote}/search?value${equals}&quot;a&#39;b&quot;&amp;next${equals}1${quote}></form>`;
    const output = render(source);
    assert.equal(parseHTML(output).document.querySelector("form").getAttribute("action"), '/search/?value="a\'b"&next=1');
  }
  assert.equal(render('<area href="/&#97;bout">'), '<area href="/about/">');
});

test("path-link classes and non-HTML output retain their existing behavior", () =>
{
  assert.equal(render('<a class="internal" href="/about">/about</a>'), '<a class="internal path" href="/about/">/about</a>');
  const source = `<a href="${encodedEmail}">email</a>`;
  assert.equal(render(source, "feeds/everything.rss"), source);
});
