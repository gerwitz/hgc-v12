const normalizeTopic = (topic) => topic.toLowerCase();

export const filterByTopics = (collection, topics) => {
  const requestedTopics = new Set(topics.map(normalizeTopic));

  return collection.filter((item) => {
    return item.data.topics?.some((topic) => requestedTopics.has(normalizeTopic(topic)));
  });
};

export const filterKnownTopics = (topics, knownTopicPages) => {
  const knownTopics = new Set(knownTopicPages.map((topic) => normalizeTopic(topic.data.topicSlug)));

  return (topics || []).filter((topic) => knownTopics.has(normalizeTopic(topic)));
};
