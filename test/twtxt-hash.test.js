import assert from "node:assert/strict";
import test from "node:test";

import { twtxtHash } from "../eleventy/twtxt-hash.js";

const url = "https://example.com/twtxt.txt";

test("twt hashes match the specification's v1 and v2 reference vectors", () =>
{
  assert.equal(twtxtHash(url, "2025-04-29T12:00:00Z", "Hello World!"), "om5qesa");
  assert.equal(twtxtHash(url, "2026-07-01T00:00:00Z", "Hello World!"), "myzxbwxktuvs");
});

test("twt hashes preserve non-UTC offsets and UTF-8 multiline text", () =>
{
  assert.equal(
    twtxtHash("https://example.com/hugo", "2026-12-28T14:00:00+01:00", "(#1234567890ab) Sounds good!"),
    "v4yu3xmr65z7"
  );
  assert.equal(twtxtHash(url, "2026-07-01T00:00:00Z", "Café 🌍\u2028第二行"), "6nivaw4qyahn");
});
