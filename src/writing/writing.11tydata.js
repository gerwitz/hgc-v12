export default {
  eleventyComputed: {
    // respect draft frontmatter
    eleventyExcludeFromCollections: function(data) {
      return ('draft' in data && data.draft == true);
    },
    // use template date for breadcrumb
    breadcrumbs: data => [
      "writing",
      data.page && data.page.date
        ? data.page.date.toISOString().slice(0, 10)
        : undefined
    ]
  }
};
