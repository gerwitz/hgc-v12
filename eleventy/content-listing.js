import { geminiPostUrl } from "./collections/gemlog.js";

// Share membership without reading collection items' lazy content getters.
export const getContentSources = (collections) =>
{
  const gemposts = (collections.gemposts || [])
    .filter((item) => item.data.draft !== true)
    .map((item) => ({
      inputPath: item.inputPath,
      date: item.date,
      fileSlug: item.fileSlug,
      url: geminiPostUrl(item),
      data: item.data,
    }));

  return [...(collections.searchable || []), ...gemposts];
};
