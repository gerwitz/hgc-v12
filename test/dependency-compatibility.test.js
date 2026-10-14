import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseHTML } from "linkedom";

import { hexmap } from "../eleventy/shortcodes/hexmap.js";
import { renderMap } from "../eleventy/shortcodes/map.js";

const lint = (source) => spawnSync(fileURLToPath(new URL("../node_modules/.bin/textlint", import.meta.url)), [
  "--stdin", "--stdin-filename", "dependency-check.md", "--format", "json",
], { input: source, encoding: "utf8", timeout: 10000 });

// Exercise rendering rather than cached SVG assets after the D3 ESM upgrade.
test("D3 renders single-pin and multi-pin maps with finite coordinates", () =>
{
  const features = [[4.9, 52.37], [2.35, 48.86]].map((coordinates) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties: {},
  }));

  for (const pins of [features.slice(0, 1), features])
  {
    const output = renderMap({ type: "FeatureCollection", features: pins });
    const { document } = parseHTML(output);
    assert.equal(document.querySelector("svg").getAttribute("viewBox"), "0 0 768 300");
    assert.equal(document.querySelectorAll("circle.pin").length, pins.length);
    assert.ok(document.querySelector("path[d]"));
    assert.doesNotMatch(output, /NaN|Infinity/);
  }
});

test("D3 renders hexagonal stay totals with finite coordinates", () =>
{
  const output = hexmap([
    { latlng: [52.37, 4.9], nights: 2, trip: "first" },
    { latlng: [52.37, 4.9], nights: 1, trip: "second" },
  ]);
  const { document } = parseHTML(output);
  const cells = document.querySelectorAll("path.h3cell");
  assert.equal(cells.length, 1);
  assert.equal(cells[0].getAttribute("data-nights"), "3");
  assert.equal(cells[0].querySelector("title").textContent, "over 2 stays");
  assert.doesNotMatch(output, /NaN|Infinity/);
});

test("textlint accepts clean Markdown using the existing configuration", () =>
{
  const result = lint("This is a clear sentence.\n");
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout)[0].messages, []);
});

test("textlint preserves spelling and write-good diagnostics", () =>
{
  const result = lint("This sentnce was written by the editor.\n");
  assert.ifError(result.error);
  assert.equal(result.status, 1, result.stderr);
  const messages = JSON.parse(result.stdout)[0].messages;
  assert.deepEqual(messages.map((message) => message.ruleId), ["spelling", "write-good"]);
  assert.equal(messages[0].message, "sentnce -> sentence");
  assert.equal(messages[0].fix.text, "sentence");
  assert.match(messages[1].message, /passive voice/);
});
