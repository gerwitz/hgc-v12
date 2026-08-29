import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// The footer toy returns to snow on a timer, so its constant has to match the real clip length.
const clip = new URL("../src/toys/network23/headroom.png", import.meta.url);
const script = new URL("../src/toys/network23/network23.js", import.meta.url);

const apngDuration = (path) => {
  const bytes = readFileSync(path);
  let offset = 8;
  let seconds = 0;

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);

    if (bytes.toString("ascii", offset + 4, offset + 8) === "fcTL") {
      const numerator = bytes.readUInt16BE(offset + 28);
      const denominator = bytes.readUInt16BE(offset + 30) || 100;
      seconds += numerator / denominator;
    }

    offset += length + 12;
  }

  return Math.round(seconds * 1000);
};

test("clip duration matches the length of headroom.png", () => {
  const declared = readFileSync(script, "utf8").match(/CLIP_DURATION = (\d+)/);

  assert.ok(declared, "network23.js no longer declares CLIP_DURATION");
  assert.equal(Number(declared[1]), apngDuration(clip));
});
