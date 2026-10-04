import { geminiPostUrl } from "../collections/gemlog.js";

export const filterExistingRelated = (relatedItems = [], contentItems = []) =>
{
  const currentUrls = new Set(contentItems
    .filter((item) => item.data?.draft !== true)
    .map((item) =>
    {
      return item.data?.tags?.includes("gemposts")
        ? geminiPostUrl(item)
        : item.url || item.page?.url;
    }));
  return relatedItems.filter((item) => currentUrls.has(item.url));
};
