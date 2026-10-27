import moment from "moment-timezone";

import { getNoteDate, NOTE_TIMEZONE } from "./note-date.js";
import { twtxtHash } from "./twtxt-hash.js";

const FEED_URL = "https://hans.gerwitz.com/twtxt.txt";

export const createTwtxtFeeds = (notes, now = new Date()) =>
{
  const currentYear = moment.tz(now, NOTE_TIMEZONE).year();
  const entries = notes
    .filter((entry) => entry.data.draft !== true && !entry.data.excludeFromFeed)
    .map((entry) =>
    {
      const published = getNoteDate(entry);
      const text = (entry.page?.rawInput || "")
        .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "")
        .trim()
        .replace(/(?<!!)\[([^\]\r\n]+)\]\(([^\s()]*(?:\([^()\r\n]*\)[^\s()]*)*)\)/g, "$1 <$2>")
        .replace(/\r\n|\r|\n/g, "\u2028");

      return {
        year: published.year(),
        time: published.valueOf(),
        timestamp: published.format("YYYY-MM-DDTHH:mm:ssZ").replace(/\+00:00$/, "Z"),
        text,
        url: entry.url,
      };
    })
    .filter((entry) => entry.year <= currentYear)
    .sort((first, second) => first.time - second.time || first.url.localeCompare(second.url));
  const years = [currentYear, ...new Set(entries
    .filter((entry) => entry.year < currentYear)
    .map((entry) => entry.year))].sort((first, second) => second - first);
  const feeds = years.map((year) => ({
    path: year === currentYear ? "/twtxt.txt" : `/twtxt-${year}.txt`,
    entries: entries.filter((entry) => entry.year === year),
  }));

  // Each prev points to the newest entry of the next older nonempty archive.
  return feeds.map((feed, index) =>
  {
    const archive = feeds[index + 1];
    const lastEntry = archive?.entries.at(-1);
    const headers = [
      "# nick = gerwitz",
      `# url = ${FEED_URL}`,
      "# description = Notes from Hans Gerwitz",
    ];

    if (lastEntry)
    {
      const hash = twtxtHash(FEED_URL, lastEntry.timestamp, lastEntry.text);
      headers.push(`# prev = ${hash} ${archive.path.slice(1)}`);
    }

    const lines = feed.entries.map((entry) => `${entry.timestamp}\t${entry.text}`);
    return {
      path: feed.path,
      content: `${headers.join("\n")}\n\n${lines.join("\n")}${lines.length ? "\n" : ""}`,
    };
  });
};
