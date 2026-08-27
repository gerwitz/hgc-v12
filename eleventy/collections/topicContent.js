import { isContent } from "./content.js";

const hasExplicitDate = (item) => {
  return Boolean(item.data.date) || /\/\d{4}-\d{2}-\d{2}-/.test(item.inputPath);
};

const getTopicDate = (item) => {
  return hasExplicitDate(item) ? item.date : null;
};

export const getTopicContent = (items) => {
  return items
    .filter(isContent)
    .filter((item) => Array.isArray(item.data.topics) && item.data.topics.length)
    .map((item) => {
      item.topicDate = getTopicDate(item);
      return item;
    })
    .sort((first, second) => {
      if (first.topicDate && second.topicDate) {
        return second.topicDate - first.topicDate;
      }

      if (first.topicDate) {
        return -1;
      }

      if (second.topicDate) {
        return 1;
      }

      return (first.data.title || first.fileSlug).localeCompare(second.data.title || second.fileSlug);
    });
};

export const topicContent = (collection) => {
  return getTopicContent(collection.getAll());
};
