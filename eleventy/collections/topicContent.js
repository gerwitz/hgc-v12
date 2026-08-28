import { isContent } from "./content.js";


export const getTopicContent = (items) => {
  return items
    .filter(isContent)
    .filter((item) => Array.isArray(item.data.topics) && item.data.topics.length)
    .sort((first, second) => {
      if (first.data.contentDate && second.data.contentDate) {
        return second.data.contentDate - first.data.contentDate;
      }

      if (first.data.contentDate) {
        return -1;
      }

      if (second.data.contentDate) {
        return 1;
      }

      return (first.data.title || first.fileSlug).localeCompare(second.data.title || second.fileSlug);
    });
};

export const topicContent = (collection) => {
  return getTopicContent(collection.getAll());
};
