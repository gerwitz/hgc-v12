export default {
  eleventyComputed: {
    // respect draft frontmatter
    eleventyExcludeFromCollections: function(data) {
      return ('draft' in data && data.draft == true);
    },
    // use template date for breadcrumb
    breadcrumbs: data => {
      const crumbs = ["writing"];
      if (data.layout !== 'index' && data.page && data.page.date) {
        crumbs.push(data.page.date.toISOString().slice(0, 10));
      }
      return crumbs;
    }
  }
};
