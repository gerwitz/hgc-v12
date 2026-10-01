import moment from "moment";

// Keep capsule publication identity independent of an entry's web permalink.
export const geminiPostPath = (entry) => {
  return `/posts/${moment(entry.date).format("YYYY-MM-DD")}-${entry.fileSlug}.gmi`;
};

export const gemlog = (collection) => {
  return collection.getFilteredByTags("writing")
      .concat(collection.getFilteredByTags("gemposts"))
      .filter((entry, index, entries) => entries.indexOf(entry) === index)
    .map((entry) => ({
      data: entry.data,
      date: entry.date,
      fileSlug: entry.fileSlug,
      page: entry.page,
      url: entry.url,
      geminiUrl: geminiPostPath(entry),
    }))
    .sort((first, second) => first.date - second.date
      || first.data.title.localeCompare(second.data.title));
};
