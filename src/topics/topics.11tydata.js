export default {
  layout: "topic",
  tags: ["topics"],
  eleventyComputed: {
    breadcrumbs: (data) => {
      if (data.layout === "index") {
        return ["topics"];
      }

      return ["topics", data.page.fileSlug];
    },
    topicSlug: (data) => data.page.fileSlug,
  },
};
