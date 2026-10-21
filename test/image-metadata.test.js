import assert from "node:assert/strict";
import test from "node:test";

import { imageMetadata, readImageMetadata } from "../eleventy/filters/image-metadata.js";

const socialImage = new URL("../src/_meta/opengraph.png", import.meta.url);
const articleImage = new URL("../src/assets/2004-04-06-linguistic-divinity/1080162080_cturesgod3.jpg", import.meta.url);

test("reads PNG social-preview metadata", () => {
  assert.deepEqual(readImageMetadata(socialImage), {
    width: 1200,
    height: 630,
    type: "image/png",
  });
});

test("reads JPEG social-preview metadata", () => {
  const metadata = readImageMetadata(articleImage);

  assert.equal(metadata.type, "image/jpeg");
  assert.ok(metadata.width > 0);
  assert.ok(metadata.height > 0);
});

test("resolves site-local preview images", () => {
  assert.deepEqual(imageMetadata("/opengraph.png"), {
    width: 1200,
    height: 630,
    type: "image/png",
  });
});

test("leaves externally hosted preview images for explicit metadata", () => {
  assert.deepEqual(imageMetadata("https://example.com/preview.png"), {});
});
