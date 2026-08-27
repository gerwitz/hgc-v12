import { getTopicContent } from "./topicContent.js";

const normalizeTopic = (topic) => topic.toLowerCase();

const getTopicSlug = (topic) => topic.data.topicSlug || topic.fileSlug;

const sortTopics = (first, second) => {
  if (first.count !== second.count) {
    return second.count - first.count;
  }

  return first.title.localeCompare(second.title);
};

const getTopicCounts = (items) => {
  const counts = new Map();

  for (const item of getTopicContent(items)) {
    for (const topic of item.data.topics) {
      const slug = normalizeTopic(topic);
      counts.set(slug, (counts.get(slug) || 0) + 1);
    }
  }

  return counts;
};

const getKnownTopicPages = (collection) => {
  return collection.getFilteredByTag("topics");
};

export const knownTopics = (collection) => {
  const counts = getTopicCounts(collection.getAll());

  return getKnownTopicPages(collection)
    .map((topic) => {
      const slug = getTopicSlug(topic);

      return {
        count: counts.get(slug) || 0,
        slug,
        title: topic.data.title,
        url: topic.url,
      };
    })
    .sort(sortTopics);
};

export const allTopics = (collection) => {
  const counts = getTopicCounts(collection.getAll());
  const knownTopicsBySlug = new Map(
    getKnownTopicPages(collection).map((topic) => [getTopicSlug(topic), topic]),
  );
  const slugs = new Set([...counts.keys(), ...knownTopicsBySlug.keys()]);

  return Array.from(slugs)
    .map((slug) => {
      const topic = knownTopicsBySlug.get(slug);

      return {
        count: counts.get(slug) || 0,
        slug,
        title: topic?.data.title || slug,
        url: topic?.url || `/topics/${slug}/`,
      };
    })
    .sort(sortTopics);
};

export const unknownTopics = (collection) => {
  const knownTopicSlugs = new Set(
    getKnownTopicPages(collection).map((topic) => getTopicSlug(topic)),
  );

  return allTopics(collection).filter((topic) => !knownTopicSlugs.has(topic.slug));
};
