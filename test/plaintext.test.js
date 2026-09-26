import assert from "node:assert/strict";
import test from "node:test";

import { plaintext } from "../eleventy/filters/plaintext.js";

test("decodes HTML entities in plain-text metadata", () => {
  assert.equal(
    plaintext("Rock &amp; Roll&#39;s &quot;title&quot;"),
    "Rock & Roll's \"title\"",
  );
});

test("removes HTML markup from plain-text metadata", () => {
  assert.equal(plaintext("A title with <em>emphasis</em>"), "A title with emphasis");
});
