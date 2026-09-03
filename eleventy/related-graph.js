const GRAPH_VERSION = 1;
const MAXIMUM_CANDIDATES = 32;
const MAXIMUM_RELATED = 8;
const MINIMUM_SCORE = 0.5;
const MINIMUM_SEMANTIC_SCORE = 0.4;
const TOPIC_WEIGHT = 0.15;

const getCosineSimilarity = (firstEmbedding, secondEmbedding) => {
  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  for (let index = 0; index < firstEmbedding.length; index += 1)
  {
    dotProduct += firstEmbedding[index] * secondEmbedding[index];
    firstMagnitude += firstEmbedding[index] ** 2;
    secondMagnitude += secondEmbedding[index] ** 2;
  }

  return dotProduct / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude));
};

const getTopicStatistics = (content) => {
  const counts = new Map();

  for (const item of content)
  {
    for (const topic of item.topics)
    {
      counts.set(topic, (counts.get(topic) || 0) + 1);
    }
  }

  const weights = new Map();
  for (const [topic, count] of counts)
  {
    weights.set(topic, Math.log((content.length + 1) / (count + 1)) + 1);
  }

  return { counts, weights };
};

const getTopicScore = (firstTopics, secondTopics, topicWeights) => {
  if (!firstTopics.length || !secondTopics.length)
  {
    return 0;
  }

  const secondTopicSet = new Set(secondTopics);
  const firstWeight = firstTopics.reduce((sum, topic) => sum + (topicWeights.get(topic) || 0), 0);
  const secondWeight = secondTopics.reduce((sum, topic) => sum + (topicWeights.get(topic) || 0), 0);
  const sharedWeight = firstTopics.reduce((sum, topic) => {
    return sum + (secondTopicSet.has(topic) ? topicWeights.get(topic) || 0 : 0);
  }, 0);

  return sharedWeight / Math.sqrt(firstWeight * secondWeight);
};

const compareCandidates = (first, second) => {
  if (first.score !== second.score)
  {
    return second.score - first.score;
  }

  return first.url.localeCompare(second.url);
};

const getCandidate = (first, second, embeddings, topicWeights) => {
  const semanticScore = getCosineSimilarity(embeddings.get(first.url), embeddings.get(second.url));
  const topicScore = getTopicScore(first.topics, second.topics, topicWeights);
  const score = semanticScore + (topicScore * TOPIC_WEIGHT);

  return {
    score,
    semanticScore,
    sharedTopics: first.topics.filter((topic) => second.topics.includes(topic)),
    topicScore,
    url: second.url,
  };
};

const getChangedTopics = (contentByUrl, cachedRecords, changedUrls, deletedUrls) => {
  const changedTopics = new Set();

  for (const url of new Set([...changedUrls, ...deletedUrls]))
  {
    for (const topic of contentByUrl.get(url)?.topics || [])
    {
      changedTopics.add(topic);
    }

    for (const topic of cachedRecords[url]?.topics || [])
    {
      changedTopics.add(topic);
    }
  }

  return changedTopics;
};

const roundCandidate = (candidate) => {
  return {
    score: Number(candidate.score.toFixed(6)),
    semanticScore: Number(candidate.semanticScore.toFixed(6)),
    sharedTopics: candidate.sharedTopics,
    topicScore: Number(candidate.topicScore.toFixed(6)),
    url: candidate.url,
  };
};

export const updateRelatedGraph = (content, embeddings, originalGraph = {}) => {
  const graph = originalGraph.version === GRAPH_VERSION ? originalGraph : { records: {} };
  const cachedRecords = graph.records || {};
  const contentByUrl = new Map(content.map((item) => [item.url, item]));
  const currentUrls = new Set(contentByUrl.keys());
  const cachedUrls = new Set(Object.keys(cachedRecords));
  const changedUrls = new Set(content
    .filter((item) => cachedRecords[item.url]?.relationshipHash !== item.relationshipHash)
    .map((item) => item.url));
  const deletedUrls = new Set(Array.from(cachedUrls).filter((url) => !currentUrls.has(url)));
  const changedTopics = getChangedTopics(contentByUrl, cachedRecords, changedUrls, deletedUrls);
  const affectedUrls = new Set(changedUrls);

  for (const item of content)
  {
    if (item.topics.some((topic) => changedTopics.has(topic)))
    {
      affectedUrls.add(item.url);
    }
  }

  const { counts: topicCounts, weights: topicWeights } = getTopicStatistics(content);
  const records = {};

  for (const source of content)
  {
    let candidates;

    if (affectedUrls.has(source.url) || !cachedRecords[source.url])
    {
      candidates = content
        .filter((destination) => destination.url !== source.url)
        .map((destination) => getCandidate(source, destination, embeddings, topicWeights));
    }
    else
    {
      const retainedCandidates = (cachedRecords[source.url].candidates || [])
        .filter((candidate) => currentUrls.has(candidate.url) && !affectedUrls.has(candidate.url));
      const updatedCandidates = content
        .filter((destination) => affectedUrls.has(destination.url) && destination.url !== source.url)
        .map((destination) => getCandidate(source, destination, embeddings, topicWeights));
      candidates = [...retainedCandidates, ...updatedCandidates];

      if (candidates.length < MAXIMUM_RELATED)
      {
        candidates = content
          .filter((destination) => destination.url !== source.url)
          .map((destination) => getCandidate(source, destination, embeddings, topicWeights));
      }
    }

    records[source.url] = {
      candidates: candidates
        .sort(compareCandidates)
        .slice(0, MAXIMUM_CANDIDATES)
        .map(roundCandidate),
      relationshipHash: source.relationshipHash,
      topics: source.topics,
    };
  }

  return {
    maximumCandidates: MAXIMUM_CANDIDATES,
    records,
    topicCounts: Object.fromEntries(Array.from(topicCounts).sort()),
    topicWeight: TOPIC_WEIGHT,
    version: GRAPH_VERSION,
  };
};

export const createRelatedData = (content, graph, model) => {
  const contentByUrl = new Map(content.map((item) => [item.url, item]));
  const selectedUrls = new Map();

  for (const item of content)
  {
    selectedUrls.set(item.url, new Set(
      graph.records[item.url].candidates
        .filter((candidate) => candidate.score >= MINIMUM_SCORE && candidate.semanticScore >= MINIMUM_SEMANTIC_SCORE)
        .slice(0, MAXIMUM_RELATED)
        .map((candidate) => candidate.url),
    ));
  }

  const sources = {};
  for (const source of content)
  {
    const related = graph.records[source.url].candidates
      .filter((candidate) => selectedUrls.get(source.url).has(candidate.url))
      .filter((candidate) => selectedUrls.get(candidate.url)?.has(source.url))
      .map((candidate) => {
        const destination = contentByUrl.get(candidate.url);

        return {
          category: destination.categories,
          kind: destination.kind,
          score: Number(candidate.score.toFixed(3)),
          semanticScore: Number(candidate.semanticScore.toFixed(3)),
          sharedTopics: candidate.sharedTopics,
          title: destination.title,
          topicScore: Number(candidate.topicScore.toFixed(3)),
          topics: destination.topics,
          url: destination.url,
        };
      });

    sources[source.url] = {
      category: source.categories,
      kind: source.kind,
      related,
      topics: source.topics,
    };
  }

  return {
    maximumRelated: MAXIMUM_RELATED,
    minimumScore: MINIMUM_SCORE,
    minimumSemanticScore: MINIMUM_SEMANTIC_SCORE,
    model,
    sources,
    topicWeight: TOPIC_WEIGHT,
  };
};
