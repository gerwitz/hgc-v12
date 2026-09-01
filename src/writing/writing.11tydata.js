const normalizeTopic = (topic) => topic.toLowerCase();

const countWords = (markdown) => {
  const text = markdown
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/^\s*\[[^\]]+\]:\s+\S+.*$/gm, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_~#>]/g, " ")
    .trim();

  return text ? text.split(/\s+/).length : 0;
};

const getKnownTopics = (data) => {
  const topicsBySlug = new Map(
    data.collections.topics.map((topic) => [
      normalizeTopic(topic.data.topicSlug || topic.fileSlug),
      topic.data.title,
    ]),
  );

  return (data.topics || [])
    .map((topic) => topicsBySlug.get(normalizeTopic(topic)))
    .filter(Boolean);
};

export default {
  layout: "writing",
  tags: ["writing", "searchable"],
  eleventyComputed: {
    // Respect draft front matter.
    eleventyExcludeFromCollections: (data) => {
      return "draft" in data && data.draft === true;
    },
    // Use the template date for the breadcrumb.
    breadcrumbs: (data) => {
      const crumbs = ["writing"];

      if (data.layout !== "index" && data.page && data.page.date) {
        crumbs.push(data.page.date.toISOString().slice(0, 10));
      }

      return crumbs;
    },
    // Let individual pages override this generated description.
    meta_description: (data) => {
      if (data.meta_description || data.layout !== "writing") {
        return data.meta_description;
      }

      const wordCount = countWords(data.page.rawInput);
      const knownTopics = getKnownTopics(data);
      const topicDescription = knownTopics.length ? ` on ${knownTopics.join(", ")}` : "";

      return `${wordCount} words${topicDescription}`;
    },
  },
};
