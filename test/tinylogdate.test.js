import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import Eleventy from "@11ty/eleventy";

import { tinylogDate } from "../eleventy/filters/tinylogdate.js";
import { markdownToGemtext } from "../eleventy/gemtext.js";

const note = (value) => ({
  date: new Date("2026-10-01T00:00:00Z"),
  page: {
    inputPath: "./src/notes/2026/2026-10-01-example.md",
    rawInput: `---\ndate: ${value}\n---\n\nA note.\n`,
  },
});

const cases = [
  ["2026-10-01T07:11:00.000+02:00", "2026-10-01 07:11 +0200"],
  ["'2025-01-16T07:11:00+02:00'", "2025-01-16 07:11 +0200"],
  ['"2025-06-16T23:45:00-05:30"', "2025-06-16 23:45 -0530"],
  ["2025-06-16T23:45:00Z", "2025-06-16 23:45 +0000"],
  ["2025-06-16T00:00:00Z", "2025-06-16 00:00 +0000"],
  ["2025-06-16T07:11:00", "2025-06-16 07:11 +0200"],
  ["2025-01-16T07:11:00", "2025-01-16 07:11 +0100"],
  ["2025-06-16", "2025-06-16 12:00 +0200"],
  ["'2025-01-16' # No publication time", "2025-01-16 12:00 +0100"],
  ["2026-03-29T01:30:00", "2026-03-29 01:30 +0100"],
  ["2026-03-29T03:30:00", "2026-03-29 03:30 +0200"],
  ["2026-10-25T01:30:00", "2026-10-25 01:30 +0200"],
  ["2026-10-25T03:30:00", "2026-10-25 03:30 +0100"],
];

for (const [value, expected] of cases)
{
  test(`tinylog formats source date ${value}`, () => {
    assert.equal(tinylogDate(note(value)), expected);
  });
}

test("tinylog uses the filename date and Amsterdam noon when no date is authored", () => {
  const entry = note("2026-10-01");
  entry.page.rawInput = "---\nupdated: 2026-10-02T14:00:00Z\n---\n\nA note.";
  entry.date = new Date("2026-10-02T14:00:00Z");
  assert.equal(tinylogDate(entry), "2026-10-01 12:00 +0200");
});

test("tinylog falls back to the collection date at Amsterdam noon", () => {
  assert.equal(tinylogDate({ date: new Date("2025-01-16T00:00:00Z") }), "2025-01-16 12:00 +0100");
});

test("tinylog rejects invalid authored dates with the source path", () => {
  assert.throws(() => tinylogDate(note("not-a-date")), /Invalid tinylog date.*2026-10-01-example\.md/);
});

test("the actual tinylog template preserves source offsets after Eleventy parses note dates", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "hgc-tinylog-dates-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const input = path.join(directory, "src");
  const output = path.join(directory, "output");
  await mkdir(path.join(input, "notes"), { recursive: true });
  await copyFile(new URL("../src/_editions/gemini/tinylog/index.njk", import.meta.url), path.join(input, "tinylog.njk"));

  const dates = [
    ["2026-10-01", "2026-10-01T07:11:00.000+02:00", "2026-10-01 07:11 +0200"],
    ["2025-06-16", "2025-06-16", "2025-06-16 12:00 +0200"],
    ["2025-01-16", "2025-01-16T09:30:00", "2025-01-16 09:30 +0100"],
    ["2025-01-15", "'2025-01-15T23:45:00-05:30'", "2025-01-15 23:45 -0530"],
  ];

  for (const [filenameDate, value] of dates)
  {
    await writeFile(path.join(input, "notes", `${filenameDate}-example.md`),
      `---\ntags: [notes]\ndate: ${value}\n---\n\nA note.\n`);
  }

  const eleventy = new Eleventy(input, output, {
    configPath: false,
    config: (configuration) => {
      configuration.setQuietMode(true);
      configuration.addFilter("tinylogDate", tinylogDate);
      configuration.addFilter("gemtext", markdownToGemtext);
      configuration.addFilter("limit", (items, count) => items.slice(0, count));
      configuration.setTemplateFormats(["md", "njk"]);
    },
  });
  await eleventy.write();
  const rendered = await readFile(path.join(output, "editions/gemini/tinylog/index.gmi"), "utf8");

  for (const [, , expected] of dates)
  {
    assert.ok(rendered.includes(`## ${expected}\n`), expected);
  }
});
