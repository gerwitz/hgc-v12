export default {
  layout: "topic",
  tags: ["topics"],
  eleventyComputed: {
    breadcrumbs: (data) => {
      if (data.layout === "index") {
        return ["topics"];
      }

      return ["topics", data.topicEntry?.slug || data.page.fileSlug];
    },
    topicSlug: (data) => data.topicEntry?.slug || data.page.fileSlug,
  },
};
