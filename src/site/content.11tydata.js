import { geminiPostUrl } from "../../eleventy/collections/gemlog.js";

const contentTypes = [
  ["about", "About"],
  ["gemposts", "Gemposts"],
  ["ideas", "Ideas"],
  ["lists", "Lists"],
  ["notes", "Notes"],
  ["projects", "Projects"],
  ["site", "Site"],
  ["weeknotes", "Weeknotes"],
  ["writing", "Writing"],
];

const getContentType = (item) => {
  const tags = item.data.tags || [];
  const contentType = contentTypes.find(([tag]) => tags.includes(tag));

  return contentType ? contentType[1] : "Other";
};

const getItemName = (item) => item.data.title || item.fileSlug;

const sortItems = (firstItem, secondItem) => {
  const firstDate = firstItem.data.contentDate?.getTime();
  const secondDate = secondItem.data.contentDate?.getTime();

  if (firstDate && secondDate && firstDate !== secondDate) {
    return secondDate - firstDate;
  }

  if (firstDate) {
    return -1;
  }

  if (secondDate) {
    return 1;
  }

  return getItemName(firstItem).localeCompare(getItemName(secondItem));
};

const getContentGroups = (items) => {
  const groups = new Map();

  for (const item of items) {
    const contentType = getContentType(item);
    const group = groups.get(contentType) || [];

    group.push(item);
    groups.set(contentType, group);
  }

  return Array.from(groups, ([title, items]) => ({
    title,
    hasDatedItems: items.some((item) => item.data.contentDate),
    items: items.sort(sortItems),
  })).sort((firstGroup, secondGroup) => firstGroup.title.localeCompare(secondGroup.title));
};

export default {
  eleventyComputed: {
    contentGroups: (data) =>
    {
      // Gemini-only posts join the search corpus without a web permalink.
      const gemposts = (data.collections.gemposts || [])
        .filter((item) => item.data.draft !== true)
        .map((item) => ({
          // Collection items have lazy content getters; do not spread them here.
          fileSlug: item.fileSlug,
          url: geminiPostUrl(item),
          data: {
            ...item.data,
            contentDate: item.data.contentDate || item.date,
          },
        }));

      return getContentGroups([...data.collections.searchable, ...gemposts]);
    },
  },
};
