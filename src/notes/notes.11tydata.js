import moment from "moment";

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
  eleventyComputed: {
    // Give each note a stable title without requiring front matter.
    title: (data) => {
      if (data.layout === "index" || !data.page?.date) {
        return data.title;
      }

      return `Note from ${moment(data.page.date).format("MMMM Do, YYYY")}`;
    },
    // Use the template date for the breadcrumb.
    breadcrumbs: data => {
      const crumbs = ["notes"];
      if (data.layout !== 'index' && data.page && data.page.date) {
        crumbs.push(data.page.date.toISOString().slice(0, 10));
      }
      return crumbs;
    },
    // Let an authored subtitle override this generated description.
    description: (data) => {
      if (data.description || data.subtitle || data.layout !== "note") {
        return data.description || data.subtitle;
      }

      const wordCount = countWords(data.page.rawInput);
      const knownTopics = getKnownTopics(data);
      const topicDescription = knownTopics.length ? ` on ${knownTopics.join(", ")}` : "";

      return `${wordCount} words${topicDescription}`;
    },
  }
};
