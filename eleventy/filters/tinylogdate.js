import { existsSync, readFileSync } from "node:fs";

import { JSON_SCHEMA, load } from "js-yaml";
import moment from "moment-timezone";

const DEFAULT_TIMEZONE = "Europe/Amsterdam";

// Read the authored date before YAML or Eleventy converts away its timezone offset.
export const tinylogDate = (entry) => {
  const inputPath = entry.page?.inputPath || entry.inputPath;
  // Eleventy's rawInput excludes front matter, so read the original source when available.
  const source = inputPath && existsSync(inputPath)
    ? readFileSync(inputPath, "utf8")
    : entry.page?.rawInput || "";
  const frontMatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const authoredDate = frontMatter ? load(frontMatter[1], { schema: JSON_SCHEMA })?.date : undefined;
  const filenameDate = inputPath?.match(/(?:^|\/)(\d{4}-\d{2}-\d{2})-/)?.[1];
  const value = String(authoredDate ?? filenameDate ?? moment.utc(entry.date).format("YYYY-MM-DD")).trim();
  const hasTime = /[Tt ]\d{2}:\d{2}/.test(value);
  const timestamp = hasTime ? value : `${value}T12:00:00`;
  const hasTimezone = /(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/.test(timestamp);
  const published = hasTimezone
    ? moment.parseZone(timestamp, moment.ISO_8601, true)
    : moment.tz(timestamp, moment.ISO_8601, true, DEFAULT_TIMEZONE);

  if (!published.isValid())
  {
    throw new Error(`Invalid tinylog date "${value}" in ${inputPath || entry.url}`);
  }

  return published.format("YYYY-MM-DD HH:mm ZZ");
};
