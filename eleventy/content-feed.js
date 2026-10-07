import moment from "moment";

import { getContentSources } from "./content-listing.js";

const SITE_URL = "https://hans.gerwitz.com";

const parseDate = (value) =>
{
  if (!(value instanceof Date) && typeof value !== "string")
  {
    return null;
  }

  const date = value instanceof Date
    ? new Date(value)
    : moment.utc(value, moment.ISO_8601, true).toDate();
  return Number.isNaN(date.getTime()) ? null : date;
};

const getPublicationDate = (item, gitDates) =>
{
  if (item.data.updated !== undefined)
  {
    const updated = parseDate(item.data.updated);

    if (!updated)
    {
      throw new Error(`Invalid updated date in ${item.inputPath || item.url}: ${String(item.data.updated)}. Set updated to a valid ISO date or remove it.`);
    }

    return updated;
  }

  // Computed contentDate may not have resolved yet; never use filesystem item.date.
  const inputPath = item.inputPath?.replaceAll("\\", "/").replace(/^(?:\.\/)+/, "");
  const filename = inputPath?.split("/").pop();
  const filenameDate = filename?.match(/^(\d{4}-\d{2}-\d{2})(?:-|\.|$)/)?.[1];

  return parseDate(item.data.contentDate)
    || parseDate(item.data.date)
    || parseDate(filenameDate)
    || parseDate(gitDates[inputPath]);
};

export const getContentFeedItems = (collections, gitDates = {}, fallbackDate) =>
{
  return getContentSources(collections)
    .map((item) =>
    {
      const url = new URL(item.url, SITE_URL).href;
      const date = getPublicationDate(item, gitDates) || parseDate(fallbackDate);

      return {
        title: item.data.title || item.fileSlug,
        url,
        guid: url,
        description: item.data.description || item.data.subtitle || "",
        date,
        pubDate: date?.toUTCString(),
      };
    })
    .sort((firstItem, secondItem) =>
    {
      const firstDate = firstItem.date?.getTime() ?? -Infinity;
      const secondDate = secondItem.date?.getTime() ?? -Infinity;

      return secondDate - firstDate || firstItem.guid.localeCompare(secondItem.guid);
    });
};
